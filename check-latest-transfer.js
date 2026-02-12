const mongoose = require('mongoose');
require('dotenv').config();

async function checkLatestTransfer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const InventoryTransfer = require('./models/InventoryTransfer');

    // 查找最新的调货订单
    const transfer = await InventoryTransfer.findOne().sort({ createdAt: -1 });

    if (!transfer) {
      console.log('❌ 没有找到调货订单');
      return;
    }

    console.log('=== 最新调货订单 ===');
    console.log('订单号:', transfer.transferNumber);
    console.log('状态:', transfer.status);
    console.log('调出方:', transfer.fromMerchantName, `(${transfer.fromMerchant})`);
    console.log('调入方:', transfer.toMerchantName, `(${transfer.toMerchant})`);
    console.log('创建时间:', transfer.createdAt);
    console.log('\n=== 产品列表 ===');
    
    transfer.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log('   - inventoryId:', item.inventoryId);
      console.log('   - 品牌:', item.brand || 'N/A');
      console.log('   - 型号:', item.model || 'N/A');
      console.log('   - 颜色:', item.color || 'N/A');
      console.log('   - 数量:', item.quantity);
      console.log('   - 序列号:', item.serialNumber || '❌ 空');
      console.log('   - IMEI:', item.imei || '❌ 空');
    });

    console.log('\n=== 检查对应的库存记录 ===');
    const MerchantInventory = require('./models/MerchantInventory');
    
    for (const item of transfer.items) {
      const inventory = await MerchantInventory.findById(item.inventoryId);
      if (inventory) {
        console.log(`\n产品: ${item.productName}`);
        console.log('  库存记录ID:', inventory._id);
        console.log('  序列号:', inventory.serialNumber || '❌ 空');
        console.log('  IMEI:', inventory.imei || '❌ 空');
        console.log('  是否是设备:', !!(inventory.serialNumber || inventory.imei) ? '✅ 是' : '❌ 否');
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkLatestTransfer();
