const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone11Colors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('📱 检查 iPhone 11 的颜色数据\n');
    console.log('='.repeat(80));
    
    // 1. 检查 ProductNew
    console.log('\n1. ProductNew 中的 iPhone 11:');
    const productNewItems = await ProductNew.find({
      name: /iPhone 11/i,
      isActive: true,
      condition: 'PRE-OWNED'
    });
    
    console.log(`   找到 ${productNewItems.length} 个产品\n`);
    
    productNewItems.forEach(product => {
      const availableSerials = product.serialNumbers?.filter(sn => sn.status === 'available') || [];
      console.log(`   产品 ${product._id}:`);
      console.log(`     名称: ${product.name}`);
      console.log(`     颜色: ${product.color}`);
      console.log(`     库存: ${product.stockQuantity}`);
      console.log(`     可用序列号: ${availableSerials.length} 个`);
      if (availableSerials.length > 0) {
        console.log(`     序列号: ${availableSerials.map(sn => sn.serialNumber).join(', ')}`);
      }
      console.log('');
    });
    
    // 2. 检查 AdminInventory
    console.log('\n2. AdminInventory 中的 iPhone 11:');
    const adminItems = await AdminInventory.find({
      productName: /iPhone 11/i,
      isActive: true,
      condition: 'PRE-OWNED',
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    });
    
    console.log(`   找到 ${adminItems.length} 个产品\n`);
    
    adminItems.forEach(item => {
      console.log(`   产品 ${item._id}:`);
      console.log(`     名称: ${item.productName}`);
      console.log(`     颜色: ${item.color}`);
      console.log(`     数量: ${item.quantity}`);
      console.log(`     序列号: ${item.serialNumber || 'N/A'}`);
      console.log('');
    });
    
    // 3. 调用仓库产品API，看看返回的数据
    console.log('\n3. 调用仓库产品API:');
    const axios = require('axios');
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (response.data.success) {
      const iphone11Groups = response.data.data.filter(group => 
        group.products.some(p => p.name && p.name.includes('iPhone 11')) &&
        group.category === 'Pre-Owned Devices'
      );
      
      console.log(`   找到 ${iphone11Groups.length} 个 iPhone 11 产品组\n`);
      
      iphone11Groups.forEach((group, index) => {
        console.log(`   产品组 ${index + 1}:`);
        console.log(`     品牌: ${group.brand}`);
        console.log(`     型号: ${group.model}`);
        console.log(`     颜色: ${group.color}`);
        console.log(`     总库存: ${group.totalAvailable}`);
        console.log(`     子产品数量: ${group.products.length}`);
        console.log(`     子产品:`);
        group.products.forEach((p, i) => {
          console.log(`       ${i + 1}. ${p.name} - 颜色: ${p.color}, 库存: ${p.actualAvailable || p.stockQuantity}`);
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone11Colors();
