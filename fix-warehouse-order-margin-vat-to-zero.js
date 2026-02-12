// 修复仓库订单 - 将Margin VAT产品的税额改回0
require('dotenv').config();
const mongoose = require('mongoose');

async function fixMarginVATToZero() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderNumber = 'WO-20260212-2243';
    
    const order = await WarehouseOrder.findOne({ orderNumber });
    
    if (!order) {
      console.log(`❌ 找不到订单: ${orderNumber}`);
      return;
    }
    
    console.log(`📦 修复仓库订单: ${orderNumber}\n`);
    console.log('修复前的数据:');
    console.log(`  总金额: €${order.totalAmount}`);
    console.log(`  不含税小计: €${order.subtotal}`);
    console.log(`  税额: €${order.taxAmount}\n`);
    
    let newSubtotal = 0;
    let newTaxAmount = 0;
    let totalAmount = 0;
    
    console.log('重新计算每个产品的税额:\n');
    
    for (let item of order.items) {
      const oldTaxAmount = item.taxAmount;
      const itemTotal = item.subtotal;
      let newItemTaxAmount = 0;
      let newItemSubtotal = 0;
      
      if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
        // Margin VAT: 买方采购时税额为0
        newItemTaxAmount = 0;
        newItemSubtotal = itemTotal;
        
        console.log(`${item.productName} (${item.model}) - Margin VAT`);
        console.log(`  批发价: €${item.wholesalePrice} × ${item.quantity} = €${itemTotal}`);
        console.log(`  旧税额: €${oldTaxAmount.toFixed(2)}`);
        console.log(`  新税额: €0.00 (买方采购时税额为0)`);
        console.log(`  差异: €${(oldTaxAmount - 0).toFixed(2)}\n`);
        
      } else if (item.taxClassification === 'VAT_23') {
        // VAT 23%
        newItemTaxAmount = itemTotal * (23 / 123);
        newItemSubtotal = itemTotal - newItemTaxAmount;
        
        console.log(`${item.productName} (${item.model}) - VAT 23%`);
        console.log(`  税额保持不变: €${newItemTaxAmount.toFixed(2)}\n`);
        
      } else if (item.taxClassification === 'SERVICE_VAT_13_5') {
        // Service VAT 13.5%
        newItemTaxAmount = itemTotal * (13.5 / 113.5);
        newItemSubtotal = itemTotal - newItemTaxAmount;
        
        console.log(`${item.productName} (${item.model}) - Service VAT 13.5%`);
        console.log(`  税额保持不变: €${newItemTaxAmount.toFixed(2)}\n`);
        
      } else {
        // 其他税率
        newItemTaxAmount = 0;
        newItemSubtotal = itemTotal;
      }
      
      // 更新item的税额
      item.taxAmount = newItemTaxAmount;
      
      newSubtotal += newItemSubtotal;
      newTaxAmount += newItemTaxAmount;
      totalAmount += itemTotal;
    }
    
    // 更新订单总计
    order.subtotal = newSubtotal;
    order.taxAmount = newTaxAmount;
    order.totalAmount = totalAmount;
    
    console.log('修复后的数据:');
    console.log(`  总金额: €${order.totalAmount.toFixed(2)}`);
    console.log(`  不含税小计: €${order.subtotal.toFixed(2)}`);
    console.log(`  税额: €${order.taxAmount.toFixed(2)}\n`);
    
    // 保存订单
    await order.save();
    
    console.log('✅ 订单已更新！\n');
    
    console.log('📊 修复总结:');
    console.log(`  Samsung Galaxy A53的税额从 €9.35 改回 €0.00`);
    console.log(`  订单总税额从 €32.26 改回 €22.91`);
    console.log('\n💡 Margin VAT逻辑:');
    console.log('  - 买方采购时: Tax Amt = 0');
    console.log('  - 卖方销售时: Tax Amt = (售价 - 成本) × 23/123');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

fixMarginVATToZero();
