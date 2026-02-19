const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone13Stock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('📱 检查 iPhone 13 的库存数据\n');
    console.log('='.repeat(80));
    
    // 1. 检查 ProductNew
    console.log('\n1. ProductNew 中的 iPhone 13:');
    const productNewItems = await ProductNew.find({
      name: /iPhone 13/i,
      isActive: true,
      condition: 'PRE-OWNED'
    });
    
    console.log(`   找到 ${productNewItems.length} 个产品\n`);
    
    let totalProductNewStock = 0;
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
      totalProductNewStock += product.stockQuantity;
      console.log('');
    });
    
    console.log(`   ProductNew 总库存: ${totalProductNewStock}\n`);
    
    // 2. 检查 AdminInventory
    console.log('\n2. AdminInventory 中的 iPhone 13:');
    const adminItems = await AdminInventory.find({
      productName: /iPhone 13/i,
      isActive: true,
      condition: 'PRE-OWNED',
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    });
    
    console.log(`   找到 ${adminItems.length} 个产品\n`);
    
    let totalAdminStock = 0;
    adminItems.forEach(item => {
      console.log(`   产品 ${item._id}:`);
      console.log(`     名称: ${item.productName}`);
      console.log(`     颜色: ${item.color}`);
      console.log(`     型号: ${item.model}`);
      console.log(`     数量: ${item.quantity}`);
      console.log(`     序列号: ${item.serialNumber || 'N/A'}`);
      totalAdminStock += item.quantity;
      console.log('');
    });
    
    console.log(`   AdminInventory 总库存: ${totalAdminStock}\n`);
    
    // 3. 检查已售出的序列号
    console.log('\n3. 检查已售出的 iPhone 13 序列号:');
    const soldProducts = await ProductNew.find({
      name: /iPhone 13/i,
      'serialNumbers.status': 'sold'
    });
    
    const soldSerials = [];
    soldProducts.forEach(product => {
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        product.serialNumbers.forEach(sn => {
          if (sn.status === 'sold') {
            soldSerials.push({
              serialNumber: sn.serialNumber,
              productName: product.name
            });
          }
        });
      }
    });
    
    console.log(`   找到 ${soldSerials.length} 个已售序列号:`);
    soldSerials.forEach(s => {
      console.log(`     - ${s.serialNumber} (${s.productName})`);
    });
    
    // 4. 总结
    console.log('\n' + '='.repeat(80));
    console.log('📊 库存总结:');
    console.log(`   ProductNew 可用库存: ${totalProductNewStock}`);
    console.log(`   AdminInventory 可用库存: ${totalAdminStock}`);
    console.log(`   总可用库存: ${totalProductNewStock + totalAdminStock}`);
    console.log(`   已售出数量: ${soldSerials.length}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone13Stock();
