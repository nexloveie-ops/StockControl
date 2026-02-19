// 搜索相似的序列号
const mongoose = require('mongoose');
require('dotenv').config();

async function searchSimilarSerial() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const searchPattern = '3533';
    
    console.log(`=== 搜索包含 "${searchPattern}" 的序列号 ===\n`);
    
    // 1. 在 ProductNew 中搜索
    console.log('📦 在 ProductNew 中搜索...');
    const productsNew = await ProductNew.find({
      'serialNumbers.serialNumber': { $regex: searchPattern, $options: 'i' }
    }).lean();
    
    if (productsNew.length > 0) {
      console.log(`✅ 找到 ${productsNew.length} 个产品:\n`);
      productsNew.forEach((product, idx) => {
        console.log(`${idx + 1}. ${product.name}`);
        console.log(`   产品ID: ${product._id}`);
        
        const matchingSerials = product.serialNumbers.filter(sn => 
          sn.serialNumber && sn.serialNumber.includes(searchPattern)
        );
        
        matchingSerials.forEach(sn => {
          console.log(`   - 序列号: ${sn.serialNumber}`);
          console.log(`     IMEI: ${sn.imei || 'N/A'}`);
          console.log(`     状态: ${sn.status}`);
        });
        console.log('');
      });
    } else {
      console.log('❌ 未找到匹配的产品\n');
    }
    
    // 2. 在 AdminInventory 中搜索
    console.log('📦 在 AdminInventory 中搜索...');
    const adminItems = await AdminInventory.find({
      serialNumber: { $regex: searchPattern, $options: 'i' }
    }).lean();
    
    if (adminItems.length > 0) {
      console.log(`✅ 找到 ${adminItems.length} 个产品:\n`);
      adminItems.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.productName}`);
        console.log(`   产品ID: ${item._id}`);
        console.log(`   序列号: ${item.serialNumber}`);
        console.log(`   IMEI: ${item.imei || 'N/A'}`);
        console.log(`   发票号: ${item.invoiceNumber}`);
        console.log(`   状态: ${item.status}`);
        console.log('');
      });
    } else {
      console.log('❌ 未找到匹配的产品\n');
    }
    
    // 3. 搜索最近入库的产品
    console.log('📦 最近入库的10个产品:');
    const recentProducts = await AdminInventory.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    recentProducts.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.productName} - SN: ${item.serialNumber || 'N/A'}`);
      console.log(`   发票号: ${item.invoiceNumber}`);
      console.log(`   创建时间: ${item.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ 搜索失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

searchSimilarSerial();
