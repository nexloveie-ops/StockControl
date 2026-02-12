const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransferPrices() {
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

    console.log('=== 订单价格信息 ===');
    console.log('订单号:', transfer.transferNumber);
    console.log('交易类型:', transfer.transferType);
    console.log('总金额:', transfer.totalAmount);
    console.log('\n=== 产品价格详情 ===\n');
    
    transfer.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName}`);
      console.log('   - transferPrice:', item.transferPrice || '❌ 空');
      console.log('   - retailPrice:', item.retailPrice || '❌ 空');
      console.log('   - 数量:', item.quantity);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkTransferPrices();
