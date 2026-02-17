const mongoose = require('mongoose');
require('dotenv').config();

const ProductCondition = require('./models/ProductCondition');

async function activateConditions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    // 激活所有成色
    const result = await ProductCondition.updateMany(
      { isActive: false },
      { $set: { isActive: true } }
    );
    
    console.log(`\n✅ 已激活 ${result.modifiedCount} 个成色选项`);
    
    // 显示所有成色
    const conditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
    
    console.log(`\n📋 激活的成色 (${conditions.length} 条):`);
    conditions.forEach(c => {
      console.log(`  ${c.sortOrder}. ${c.name} (${c.code})`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ 完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

activateConditions();
