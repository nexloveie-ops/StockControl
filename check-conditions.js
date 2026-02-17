const mongoose = require('mongoose');
require('dotenv').config();

const ProductCondition = require('./models/ProductCondition');

async function checkConditions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    const conditions = await ProductCondition.find().lean();
    
    console.log(`\n📋 成色数据 (${conditions.length} 条):`);
    conditions.forEach(c => {
      console.log(`  - ${c.name} (${c.code}) - Active: ${c.isActive}, Sort: ${c.sortOrder}`);
    });
    
    if (conditions.length === 0) {
      console.log('\n⚠️  数据库中没有成色数据，需要初始化');
      console.log('\n建议添加以下成色数据:');
      const defaultConditions = [
        { code: 'BRAND_NEW', name: 'Brand New', description: '全新未拆封', sortOrder: 1 },
        { code: 'LIKE_NEW', name: 'Like New', description: '99新', sortOrder: 2 },
        { code: 'EXCELLENT', name: 'Excellent', description: '95新', sortOrder: 3 },
        { code: 'GOOD', name: 'Good', description: '90新', sortOrder: 4 },
        { code: 'FAIR', name: 'Fair', description: '85新', sortOrder: 5 }
      ];
      
      console.log('\n是否要添加默认成色数据? (运行 node init-conditions.js)');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkConditions();
