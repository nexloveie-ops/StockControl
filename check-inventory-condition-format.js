/**
 * 检查库存中的 condition 字段格式
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventoryConditionFormat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查询所有库存
    const inventory = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh'
    }).limit(10).lean();
    
    console.log(`找到 ${inventory.length} 条库存记录\n`);
    
    console.log('=== 库存成色格式 ===');
    console.log('产品名称 | condition 字段 | category 字段');
    console.log('--------|---------------|-------------');
    
    inventory.forEach(item => {
      console.log(`${item.productName} | ${item.condition || '未设置'} | ${item.category || '未设置'}`);
    });
    
    // 统计不同的 condition 值
    const conditionCounts = {};
    inventory.forEach(item => {
      const cond = item.condition || '未设置';
      conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
    });
    
    console.log('\n=== 成色统计 ===');
    Object.entries(conditionCounts).forEach(([cond, count]) => {
      console.log(`${cond}: ${count} 个产品`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkInventoryConditionFormat();
