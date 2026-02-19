const mongoose = require('mongoose');
require('dotenv').config();

async function fixTransferStatusAndDate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    // 查找所有状态为小写 completed 的调货记录
    const transfers = await InventoryTransfer.find({
      status: 'completed'
    });
    
    console.log(`📦 找到 ${transfers.length} 条状态为 'completed' 的调货记录\n`);
    
    if (transfers.length === 0) {
      console.log('✅ 没有需要修复的记录');
      return;
    }
    
    for (const transfer of transfers) {
      console.log(`修复调货单: ${transfer.transferNumber}`);
      console.log(`  当前状态: ${transfer.status}`);
      console.log(`  当前 transferDate: ${transfer.transferDate}`);
      
      // 更新状态保持为小写 completed（匹配模型定义）
      // transfer.status = 'completed'; // 不需要修改，已经是正确的
      
      // 如果 transferDate 不存在，使用 completedAt 或 createdAt
      if (!transfer.transferDate) {
        transfer.transferDate = transfer.completedAt || transfer.createdAt;
        console.log(`  设置 transferDate 为: ${transfer.transferDate}`);
        
        await transfer.save();
        console.log(`  ✅ 已更新\n`);
      } else {
        console.log(`  ✅ transferDate 已存在，无需更新\n`);
      }
    }
    
    console.log('✅ 所有调货记录已修复');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixTransferStatusAndDate();
