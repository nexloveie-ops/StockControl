const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const order = await WarehouseOrder.findById('699609a8e3384a2c59db006e').lean();
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('订单号:', order.orderNumber);
    console.log('商户:', order.merchantId);
    console.log('订单日期:', order.orderDate);
    console.log('状态:', order.status);
    console.log('产品数量:', order.items.length);
    console.log('');
    
    order.items.forEach((item, i) => {
      console.log(`产品 ${i+1}:`);
      console.log('  名称:', item.productName);
      console.log('  AdminInventory ID:', item.adminInventoryId);
      console.log('  数量:', item.quantity);
      console.log('  批发价:', item.wholesalePrice);
      console.log('  成本价:', item.costPrice);
      console.log('');
    });
    
    // 查询AdminInventory获取序列号
    console.log('=== 查询AdminInventory获取序列号 ===\n');
    const AdminInventory = require('./models/AdminInventory');
    
    for (const item of order.items) {
      if (item.adminInventoryId) {
        const adminInv = await AdminInventory.findById(item.adminInventoryId).lean();
        if (adminInv) {
          console.log(`${item.productName}:`);
          console.log(`  序列号: ${adminInv.serialNumber}`);
          console.log(`  颜色: ${adminInv.color}`);
          console.log('');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrder();
