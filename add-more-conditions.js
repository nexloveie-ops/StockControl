require('dotenv').config();
const mongoose = require('mongoose');

async function addMoreConditions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const ProductCondition = require('./models/ProductCondition');

    // 检查是否已存在
    const existingConditions = await ProductCondition.find().lean();
    console.log(`当前有 ${existingConditions.length} 个成色\n`);

    // 要添加的成色
    const newConditions = [
      { code: 'LIKE_NEW', name: 'Like New', description: '准新，几乎无使用痕迹', sortOrder: 2 },
      { code: 'EXCELLENT', name: 'Excellent', description: '优秀，轻微使用痕迹', sortOrder: 3 },
      { code: 'GOOD', name: 'Good', description: '良好，有使用痕迹', sortOrder: 4 },
      { code: 'FAIR', name: 'Fair', description: '一般，明显使用痕迹', sortOrder: 5 }
    ];

    for (const cond of newConditions) {
      // 检查是否已存在
      const existing = await ProductCondition.findOne({ code: cond.code });
      
      if (existing) {
        console.log(`⚠️  ${cond.name} (${cond.code}) 已存在，跳过`);
      } else {
        await ProductCondition.create(cond);
        console.log(`✅ 添加成色: ${cond.name} (${cond.code})`);
      }
    }

    // 更新现有成色的排序
    await ProductCondition.updateOne({ code: 'BRAND NEW' }, { sortOrder: 1 });
    await ProductCondition.updateOne({ code: 'PRE-OWNED' }, { sortOrder: 6 });

    console.log('\n=== 最终成色列表 ===');
    const allConditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    allConditions.forEach((cond, index) => {
      console.log(`${index + 1}. ${cond.name} (${cond.code}) - 排序: ${cond.sortOrder}`);
    });

    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

addMoreConditions();
