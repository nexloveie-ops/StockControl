require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function testConditionsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const ProductCondition = require('./models/ProductCondition');

    // 1. 检查数据库中的成色数据
    console.log('=== 数据库中的成色数据 ===');
    const conditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (conditions.length === 0) {
      console.log('⚠️  数据库中没有成色数据，创建默认数据...\n');
      
      const defaultConditions = [
        { code: 'BRAND_NEW', name: 'Brand New', description: '全新未拆封', sortOrder: 1 },
        { code: 'LIKE_NEW', name: 'Like New', description: '准新，几乎无使用痕迹', sortOrder: 2 },
        { code: 'EXCELLENT', name: 'Excellent', description: '优秀，轻微使用痕迹', sortOrder: 3 },
        { code: 'GOOD', name: 'Good', description: '良好，有使用痕迹', sortOrder: 4 },
        { code: 'FAIR', name: 'Fair', description: '一般，明显使用痕迹', sortOrder: 5 }
      ];

      for (const cond of defaultConditions) {
        await ProductCondition.create(cond);
      }

      console.log('✅ 默认成色数据创建成功\n');
      
      // 重新查询
      const newConditions = await ProductCondition.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .lean();
      
      newConditions.forEach((cond, index) => {
        console.log(`${index + 1}. ${cond.name} (${cond.code})`);
        console.log(`   描述: ${cond.description || 'N/A'}`);
        console.log(`   排序: ${cond.sortOrder}`);
        console.log('');
      });
    } else {
      console.log(`找到 ${conditions.length} 个成色\n`);
      
      conditions.forEach((cond, index) => {
        console.log(`${index + 1}. ${cond.name} (${cond.code})`);
        console.log(`   描述: ${cond.description || 'N/A'}`);
        console.log(`   排序: ${cond.sortOrder}`);
        console.log('');
      });
    }

    // 2. 测试API
    console.log('=== 测试API ===');
    try {
      const response = await axios.get('http://localhost:3000/api/merchant/conditions');
      
      if (response.data.success) {
        console.log(`✅ API调用成功，返回 ${response.data.data.length} 个成色\n`);
        
        response.data.data.forEach((cond, index) => {
          console.log(`${index + 1}. ${cond.name} (${cond.code})`);
        });
      } else {
        console.log('❌ API返回失败:', response.data.error);
      }
    } catch (error) {
      console.error('❌ API调用失败:', error.message);
    }

    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

testConditionsAPI();
