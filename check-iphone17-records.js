const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    
    // 查询所有包含"iPhone 17"的记录（模糊匹配）
    const records = await ProductNew.find({ 
      name: /iPhone 17/i
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${records.length} 条包含"iPhone 17"的记录 (ProductNew表):\n`);
    
    records.forEach((r, i) => {
      console.log(`${i+1}. _id: ${r._id}`);
      console.log(`   名称: ${r.name}`);
      console.log(`   SKU: ${r.sku}`);
      console.log(`   品牌: ${r.brand}`);
      console.log(`   型号: ${r.model}`);
      console.log(`   颜色: ${r.color}`);
      console.log(`   成色: ${r.condition}`);
      console.log(`   产品类型: ${r.productType}`);
      console.log(`   库存数量: ${r.stockQuantity}`);
      console.log(`   序列号数量: ${r.serialNumbers?.length || 0}`);
      if (r.serialNumbers && r.serialNumbers.length > 0) {
        r.serialNumbers.forEach((sn, idx) => {
          console.log(`     ${idx+1}. ${sn.serialNumber} (${sn.color || '无颜色'}) - ${sn.status}`);
        });
      }
      console.log(`   创建时间: ${r.createdAt}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 错误:', err);
    process.exit(1);
  });
