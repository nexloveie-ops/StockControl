require('dotenv').config();
const mongoose = require('mongoose');

async function fixWarehouseOrderMarginVatTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查询所有仓库订单
    const orders = await WarehouseOrder.find({});
    
    console.log(`📦 找到 ${orders.length} 个仓库订单\n`);
    
    let fixedCount = 0;
    
    for (const order of orders) {
      let needsUpdate = false;
      let newTotalTax = 0;
      let newSubtotal = 0;
      
      // 检查每个产品
      order.items.forEach(item => {
        if (item.taxClassification === 'MARGIN_VAT_0' && item.taxAmount > 0) {
          console.log(`🔧 修复订单 ${order.orderNumber} 中的 Margin VAT 产品:`);
          console.log(`   产品: ${item.productName}`);
          console.log(`   原税额: €${item.taxAmount.toFixed(2)}`);
          console.log(`   新税额: €0.00`);
          
          // 修复税额
          item.taxAmount = 0;
          needsUpdate = true;
        }
        
        // 重新计算总税额和小计
        newTotalTax += item.taxAmount || 0;
        newSubtotal += item.subtotal || 0;
      });
      
      if (needsUpdate) {
        // 更新订单的总税额
        order.taxAmount = newTotalTax;
        order.subtotal = newSubtotal - newTotalTax;
        
        await order.save();
        fixedCount++;
        
        console.log(`   订单总税额: €${order.taxAmount.toFixed(2)}`);
        console.log(`   订单小计: €${order.subtotal.toFixed(2)}`);
        console.log(`   ✅ 已修复\n`);
      }
    }
    
    console.log(`\n📊 修复完成:`);
    console.log(`   总订单数: ${orders.length}`);
    console.log(`   已修复订单: ${fixedCount}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixWarehouseOrderMarginVatTax();
