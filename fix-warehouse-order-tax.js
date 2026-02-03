const mongoose = require('mongoose');
require('dotenv').config();

async function fixWarehouseOrderTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    
    // 查找所有需要修复的订单
    const orders = await WarehouseOrder.find({});
    
    console.log(`\n找到 ${orders.length} 个订单`);
    
    for (const order of orders) {
      console.log(`\n=== 处理订单: ${order.orderNumber} ===`);
      
      let needUpdate = false;
      let totalAmount = 0;
      let subtotalAmount = 0;
      let totalTaxAmount = 0;
      
      // 重新计算每个项目的税额
      for (const item of order.items) {
        const product = await ProductNew.findById(item.productId);
        
        if (!product) {
          console.log(`⚠️  产品不存在: ${item.productName}`);
          continue;
        }
        
        const itemTotal = item.wholesalePrice * item.quantity;
        
        // 从 vatRate 获取税务分类
        let taxClassification = 'VAT_23';
        if (product.vatRate === 'VAT 23%') {
          taxClassification = 'VAT_23';
        } else if (product.vatRate === 'VAT 13.5%' || product.vatRate === 'Service VAT 13.5%') {
          taxClassification = 'SERVICE_VAT_13_5';
        } else if (product.vatRate === 'VAT 0%' || product.vatRate === 'Margin VAT') {
          taxClassification = 'MARGIN_VAT_0';
        }
        
        // 计算税额
        let itemTaxAmount = 0;
        let itemSubtotal = 0;
        
        if (taxClassification === 'VAT_23') {
          itemTaxAmount = itemTotal * (23 / 123);
          itemSubtotal = itemTotal - itemTaxAmount;
        } else if (taxClassification === 'SERVICE_VAT_13_5') {
          itemTaxAmount = itemTotal * (13.5 / 113.5);
          itemSubtotal = itemTotal - itemTaxAmount;
        } else if (taxClassification === 'MARGIN_VAT_0') {
          // Margin VAT: 税额 = (卖价 - 成本价) × 23/123
          const costPrice = product.costPrice || 0;
          const margin = itemTotal - (costPrice * item.quantity);
          itemTaxAmount = margin * (23 / 123);
          itemSubtotal = itemTotal - itemTaxAmount;
          
          console.log(`  Margin VAT 计算:`);
          console.log(`  - 卖价: €${itemTotal}`);
          console.log(`  - 成本: €${costPrice * item.quantity}`);
          console.log(`  - 利润: €${margin.toFixed(2)}`);
          console.log(`  - 税额: €${itemTaxAmount.toFixed(2)}`);
        } else {
          itemTaxAmount = 0;
          itemSubtotal = itemTotal;
        }
        
        // 检查是否需要更新
        if (item.taxClassification !== taxClassification || 
            Math.abs(item.taxAmount - itemTaxAmount) > 0.01) {
          needUpdate = true;
          console.log(`  ${item.productName}:`);
          console.log(`    旧税分类: ${item.taxClassification} → 新税分类: ${taxClassification}`);
          console.log(`    旧税额: €${item.taxAmount} → 新税额: €${itemTaxAmount.toFixed(2)}`);
          
          item.taxClassification = taxClassification;
          item.taxAmount = itemTaxAmount;
          item.subtotal = itemTotal;
        }
        
        totalAmount += itemTotal;
        subtotalAmount += itemSubtotal;
        totalTaxAmount += itemTaxAmount;
      }
      
      // 更新订单级别的税额
      if (needUpdate || Math.abs(order.taxAmount - totalTaxAmount) > 0.01) {
        order.subtotal = subtotalAmount;
        order.taxAmount = totalTaxAmount;
        order.totalAmount = totalAmount;
        
        await order.save();
        
        console.log(`✅ 订单已更新:`);
        console.log(`  小计: €${subtotalAmount.toFixed(2)}`);
        console.log(`  税额: €${totalTaxAmount.toFixed(2)}`);
        console.log(`  总计: €${totalAmount.toFixed(2)}`);
      } else {
        console.log(`✓ 订单税额正确，无需更新`);
      }
    }
    
    console.log('\n✅ 所有订单处理完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixWarehouseOrderTax();
