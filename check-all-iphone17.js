const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询ProductNew表
    console.log('=== ProductNew表 ===');
    const productNewRecords = await ProductNew.find({ 
      name: /iPhone 17/i
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${productNewRecords.length} 条记录:\n`);
    productNewRecords.forEach((r, i) => {
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
      console.log('');
    });
    
    // 查询AdminInventory表
    console.log('\n=== AdminInventory表 ===');
    const adminInventoryRecords = await AdminInventory.find({ 
      productName: /iPhone 17/i
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${adminInventoryRecords.length} 条记录:\n`);
    adminInventoryRecords.forEach((r, i) => {
      console.log(`${i+1}. _id: ${r._id}`);
      console.log(`   产品名称: ${r.productName}`);
      console.log(`   品牌: ${r.brand}`);
      console.log(`   型号: ${r.model}`);
      console.log(`   颜色: ${r.color}`);
      console.log(`   成色: ${r.condition}`);
      console.log(`   分类: ${r.category}`);
      console.log(`   数量: ${r.quantity}`);
      console.log(`   序列号: ${r.serialNumber || '无'}`);
      console.log(`   来源: ${r.source}`);
      console.log(`   供货商: ${r.supplier}`);
      console.log(`   创建时间: ${r.createdAt}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 错误:', err);
    process.exit(1);
  });
