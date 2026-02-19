const mongoose = require('mongoose');
require('dotenv').config();

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('🔍 检查 iPhone 13 序列号重复问题\n');
    console.log('='.repeat(80));
    
    // 获取 ProductNew 中的所有 iPhone 13 序列号
    const productNewItems = await ProductNew.find({
      name: /iPhone 13/i
    });
    
    const productNewSerials = new Set();
    const productNewSerialsDetail = [];
    
    productNewItems.forEach(product => {
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        product.serialNumbers.forEach(sn => {
          productNewSerials.add(sn.serialNumber);
          productNewSerialsDetail.push({
            serialNumber: sn.serialNumber,
            status: sn.status,
            productId: product._id,
            productName: product.name,
            stockQuantity: product.stockQuantity
          });
        });
      }
    });
    
    console.log('\n1. ProductNew 中的所有 iPhone 13 序列号:');
    productNewSerialsDetail.forEach(s => {
      console.log(`   ${s.serialNumber}: ${s.status} (产品ID: ${s.productId}, 库存: ${s.stockQuantity})`);
    });
    
    // 获取 AdminInventory 中的所有 iPhone 13 序列号
    const adminItems = await AdminInventory.find({
      productName: /iPhone 13/i
    });
    
    console.log('\n2. AdminInventory 中的所有 iPhone 13 序列号:');
    const duplicates = [];
    adminItems.forEach(item => {
      const isDuplicate = productNewSerials.has(item.serialNumber);
      console.log(`   ${item.serialNumber}: ${item.status}, 数量=${item.quantity} (ID: ${item._id}) ${isDuplicate ? '⚠️ 重复!' : ''}`);
      
      if (isDuplicate) {
        duplicates.push({
          serialNumber: item.serialNumber,
          adminInventoryId: item._id,
          adminStatus: item.status,
          adminQuantity: item.quantity
        });
      }
    });
    
    console.log('\n3. 重复的序列号:');
    if (duplicates.length > 0) {
      duplicates.forEach(d => {
        const productNewDetail = productNewSerialsDetail.find(p => p.serialNumber === d.serialNumber);
        console.log(`\n   序列号: ${d.serialNumber}`);
        console.log(`     ProductNew: ${productNewDetail.status} (产品ID: ${productNewDetail.productId})`);
        console.log(`     AdminInventory: ${d.adminStatus}, 数量=${d.adminQuantity} (ID: ${d.adminInventoryId})`);
      });
      
      console.log(`\n   ⚠️ 发现 ${duplicates.length} 个重复序列号！`);
      console.log('   这些序列号同时存在于 ProductNew 和 AdminInventory 中');
      console.log('   导致库存计算错误');
    } else {
      console.log('   ✅ 没有发现重复序列号');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 结论:');
    console.log(`   ProductNew 序列号总数: ${productNewSerials.size}`);
    console.log(`   AdminInventory 记录数: ${adminItems.length}`);
    console.log(`   重复序列号数: ${duplicates.length}`);
    console.log(`   实际可用库存应该是: ${productNewSerials.size + adminItems.length - duplicates.length}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDuplicates();
