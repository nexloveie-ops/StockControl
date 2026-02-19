const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransferItemsTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const transfer = await InventoryTransfer.findOne({ transferNumber: 'TRF20260218001' });
    
    if (!transfer) {
      console.log('❌ 调货记录不存在');
      return;
    }
    
    console.log('📦 调货单: TRF20260218001\n');
    console.log('商品明细:\n');
    
    transfer.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   调货价: €${item.transferPrice}`);
      console.log(`   taxClassification: ${item.taxClassification}`);
      console.log(`   inventoryId: ${item.inventoryId}`);
      console.log('');
    });
    
    // 查询原始库存记录的税率
    console.log('查询原始库存记录的税率:\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    for (const item of transfer.items) {
      const inventory = await MerchantInventory.findById(item.inventoryId);
      if (inventory) {
        console.log(`${item.productName}:`);
        console.log(`   原始 taxClassification: ${inventory.taxClassification}`);
        console.log(`   原始 costPrice: €${inventory.costPrice}`);
        console.log(`   原始 retailPrice: €${inventory.retailPrice}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkTransferItemsTax();
