// 测试去重修复
const mongoose = require('mongoose');
require('dotenv').config();

async function testDeduplication() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const ProductCategory = require('./models/ProductCategory');
    
    console.log('=== 测试去重逻辑 ===\n');
    
    // 模拟API逻辑
    const [productNewItems, adminInventoryItems] = await Promise.all([
      ProductNew.find({ 
        isActive: true,
        stockQuantity: { $gt: 0 }
      }).populate('category', 'name type'),
      
      AdminInventory.find({
        isActive: true,
        quantity: { $gt: 0 },
        status: 'AVAILABLE'
      })
    ]);
    
    console.log(`📦 ProductNew: ${productNewItems.length} 个产品`);
    console.log(`📦 AdminInventory: ${adminInventoryItems.length} 个产品\n`);
    
    // 收集ProductNew中的所有序列号
    const productNewSerialNumbers = new Set();
    productNewItems.forEach(product => {
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        product.serialNumbers.forEach(sn => {
          productNewSerialNumbers.add(sn.serialNumber);
        });
      }
    });
    
    console.log(`📝 ProductNew中的序列号: ${Array.from(productNewSerialNumbers).join(', ')}\n`);
    
    // 检查AdminInventory中的重复
    console.log('🔍 检查AdminInventory中的重复序列号:\n');
    let skippedCount = 0;
    let includedCount = 0;
    
    adminInventoryItems.forEach(item => {
      if (item.serialNumber && productNewSerialNumbers.has(item.serialNumber)) {
        console.log(`   ⚠️  跳过重复: ${item.productName} - ${item.serialNumber}`);
        skippedCount++;
      } else {
        console.log(`   ✅ 包含: ${item.productName} - ${item.serialNumber || '无序列号'}`);
        includedCount++;
      }
    });
    
    console.log(`\n📊 统计:`);
    console.log(`   跳过的重复项: ${skippedCount}`);
    console.log(`   包含的项: ${includedCount}`);
    
    // 模拟完整的分组逻辑
    console.log('\n\n=== 模拟完整分组 ===\n');
    
    const groupedProducts = {};
    
    // 处理 ProductNew
    productNewItems.forEach(product => {
      const isDevice = product.category?.type?.toLowerCase().includes('device');
      
      let actualAvailable = 0;
      if (isDevice && product.serialNumbers && product.serialNumbers.length > 0) {
        actualAvailable = product.serialNumbers.filter(sn => sn.status === 'available').length;
      } else {
        actualAvailable = product.stockQuantity || 0;
      }
      
      if (actualAvailable === 0) return;
      
      const productName = (product.name || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
      const key = `${product.category?.type || 'Unknown'}_${productName}_${product.color || 'NoColor'}_${product.condition}`;
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          key: key,
          products: [],
          totalAvailable: 0
        };
      }
      
      groupedProducts[key].products.push({
        name: product.name,
        color: product.color,
        actualAvailable: actualAvailable,
        source: 'ProductNew'
      });
      groupedProducts[key].totalAvailable += actualAvailable;
    });
    
    // 处理 AdminInventory（去重）
    adminInventoryItems.forEach(item => {
      if (item.serialNumber && productNewSerialNumbers.has(item.serialNumber)) {
        return; // 跳过重复
      }
      
      const isDevice = item.category?.toLowerCase().includes('device');
      const productName = (item.productName || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
      const key = `${item.category}_${productName}_${item.color || 'NoColor'}_${item.condition}`;
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          key: key,
          products: [],
          totalAvailable: 0
        };
      }
      
      groupedProducts[key].products.push({
        name: item.productName,
        color: item.color,
        actualAvailable: item.quantity,
        source: 'AdminInventory'
      });
      groupedProducts[key].totalAvailable += item.quantity;
    });
    
    console.log(`总共 ${Object.keys(groupedProducts).length} 个分组:\n`);
    
    Object.entries(groupedProducts).forEach(([key, group]) => {
      console.log(`分组: ${key}`);
      console.log(`  子产品数: ${group.products.length}`);
      console.log(`  总可用库存: ${group.totalAvailable}`);
      group.products.forEach((p, index) => {
        console.log(`    ${index + 1}. [${p.source}] ${p.name} - ${p.color || '无颜色'} (库存: ${p.actualAvailable})`);
      });
      console.log('');
    });
    
    console.log('\n✅ 测试完成');
    console.log('\n📝 修复说明:');
    console.log('1. AdminInventory中与ProductNew重复的序列号会被跳过');
    console.log('2. 避免了同一个产品被重复计算');
    console.log('3. iPhone 14现在应该只显示1个子产品，2件库存');
    console.log('\n🔄 请刷新浏览器（Ctrl+F5）查看修复效果');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDeduplication();
