const mongoose = require('mongoose');
require('dotenv').config();

async function checkCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const AdminInventory = require('./models/AdminInventory');
    
    const products = await AdminInventory.find({ 
      invoiceNumber: 'SI-3688' 
    }).lean();
    
    console.log(`\n找到 ${products.length} 个产品\n`);
    
    products.forEach((p, i) => {
      console.log(`产品 ${i + 1}:`);
      console.log(`  名称: ${p.productName}`);
      console.log(`  型号: ${p.model}`);
      console.log(`  颜色: ${p.color}`);
      console.log(`  成色: ${p.condition || '(空)'}`);
      console.log(`  序列号: ${p.serialNumber || '(无)'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkCondition();
