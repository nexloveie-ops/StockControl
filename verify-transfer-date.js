const mongoose = require('mongoose');
require('dotenv').config();

async function verifyTransferDate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const transfer = await InventoryTransfer.findOne({ transferNumber: 'TRF20260218001' });
    
    if (!transfer) {
      console.log('❌ 调货记录不存在');
      return;
    }
    
    console.log('📦 调货记录详情:');
    console.log(`   transferNumber: ${transfer.transferNumber}`);
    console.log(`   status: ${transfer.status}`);
    console.log(`   transferDate: ${transfer.transferDate}`);
    console.log(`   completedAt: ${transfer.completedAt}`);
    console.log(`   createdAt: ${transfer.createdAt}`);
    console.log('');
    
    // 检查原始文档
    console.log('📋 原始文档字段:');
    const doc = transfer.toObject();
    console.log(`   transferDate 字段存在: ${doc.hasOwnProperty('transferDate')}`);
    console.log(`   transferDate 值: ${doc.transferDate}`);
    console.log('');
    
    // 尝试手动设置并保存
    console.log('🔧 尝试手动设置 transferDate...');
    transfer.transferDate = transfer.completedAt || transfer.createdAt;
    console.log(`   设置为: ${transfer.transferDate}`);
    
    await transfer.save();
    console.log('✅ 已保存');
    
    // 重新查询验证
    const verifyTransfer = await InventoryTransfer.findOne({ transferNumber: 'TRF20260218001' });
    console.log('\n🔍 验证保存结果:');
    console.log(`   transferDate: ${verifyTransfer.transferDate}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

verifyTransferDate();
