const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransfers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    // 查询 MurrayRanelagh 作为接收方的调货记录
    const transfers = await InventoryTransfer.find({
      toMerchant: 'MurrayRanelagh'
    }).sort({ createdAt: -1 });
    
    console.log(`📦 MurrayRanelagh 作为接收方的调货记录: ${transfers.length} 条\n`);
    
    if (transfers.length > 0) {
      transfers.forEach((transfer, index) => {
        console.log(`\n${index + 1}. 调货单号: ${transfer.transferNumber}`);
        console.log(`   状态: ${transfer.status}`);
        console.log(`   发货方: ${transfer.fromMerchant}`);
        console.log(`   收货方: ${transfer.toMerchant}`);
        console.log(`   调货日期: ${transfer.transferDate}`);
        console.log(`   创建日期: ${transfer.createdAt}`);
        console.log(`   商品数: ${transfer.items ? transfer.items.length : 0}`);
        
        if (transfer.items && transfer.items.length > 0) {
          console.log(`   商品明细:`);
          transfer.items.forEach((item, i) => {
            console.log(`     ${i + 1}. ${item.productName} x${item.quantity} - €${item.transferPrice || item.costPrice || 0}`);
          });
        }
      });
    } else {
      console.log('❌ 没有找到调货记录');
    }
    
    // 也查询作为发货方的记录
    console.log('\n\n' + '='.repeat(80));
    const outgoingTransfers = await InventoryTransfer.find({
      fromMerchant: 'MurrayRanelagh'
    }).sort({ createdAt: -1 });
    
    console.log(`\n📤 MurrayRanelagh 作为发货方的调货记录: ${outgoingTransfers.length} 条\n`);
    
    if (outgoingTransfers.length > 0) {
      outgoingTransfers.forEach((transfer, index) => {
        console.log(`\n${index + 1}. 调货单号: ${transfer.transferNumber}`);
        console.log(`   状态: ${transfer.status}`);
        console.log(`   发货方: ${transfer.fromMerchant}`);
        console.log(`   收货方: ${transfer.toMerchant}`);
        console.log(`   调货日期: ${transfer.transferDate}`);
        console.log(`   商品数: ${transfer.items ? transfer.items.length : 0}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkTransfers();
