// 检查所有来源的iPhone 14数据
const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllSources() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const ProductCategory = require('./models/ProductCategory');
    
    console.log('=== 检查所有来源的 iPhone 14 ===\n');
    
    // 1. 检查 ProductNew
    console.log('1️⃣ ProductNew 中的 iPhone 14:');
    const productNewItems = await ProductNew.find({ 
      name: /iPhone 14/i,
      isActive: true
    }).populate('category', 'name type');
    
    console.log(`   找到 ${productNewItems.length} 条记录\n`);
    productNewItems.forEach((item, index) => {
      const availableSerials = item.serialNumbers?.filter(sn => sn.status === 'available') || [];
      console.log(`   ${index + 1}. ID: ${item._id}`);
      console.log(`      名称: ${item.name}`);
      console.log(`      颜色: ${item.color || '无'}`);
      console.log(`      成色: ${item.condition}`);
      console.log(`      stockQuantity: ${item.stockQuantity}`);
      console.log(`      可用序列号: ${availableSerials.length}`);
      console.log(`      序列号列表: ${availableSerials.map(sn => sn.serialNumber).join(', ')}`);
      console.log('');
    });
    
    // 2. 检查 AdminInventory
    console.log('\n2️⃣ AdminInventory 中的 iPhone 14:');
    const adminInventoryItems = await AdminInventory.find({
      productName: /iPhone 14/i,
      isActive: true,
      status: 'AVAILABLE'
    });
    
    console.log(`   找到 ${adminInventoryItems.length} 条记录\n`);
    adminInventoryItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ID: ${item._id}`);
      console.log(`      产品名称: ${item.productName}`);
      console.log(`      颜色: ${item.color || '无'}`);
      console.log(`      成色: ${item.condition}`);
      console.log(`      数量: ${item.quantity}`);
      console.log(`      序列号: ${item.serialNumber || '无'}`);
      console.log('');
    });
    
    // 3. 模拟API分组
    console.log('\n3️⃣ 模拟API分组逻辑:\n');
    
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
        _id: product._id,
        name: product.name,
        color: product.color,
        actualAvailable: actualAvailable,
        source: 'ProductNew'
      });
      groupedProducts[key].totalAvailable += actualAvailable;
    });
    
    // 处理 AdminInventory
    adminInventoryItems.forEach(item => {
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
        _id: item._id,
        name: item.productName,
        color: item.color,
        actualAvailable: item.quantity,
        source: 'AdminInventory'
      });
      groupedProducts[key].totalAvailable += item.quantity;
    });
    
    console.log(`   总共 ${Object.keys(groupedProducts).length} 个分组:\n`);
    
    Object.entries(groupedProducts).forEach(([key, group]) => {
      console.log(`   分组Key: ${key}`);
      console.log(`   子产品数: ${group.products.length}`);
      console.log(`   总可用库存: ${group.totalAvailable}`);
      console.log(`   子产品列表:`);
      group.products.forEach((p, index) => {
        console.log(`     ${index + 1}. [${p.source}] ${p.name} - ${p.color || '无颜色'} (库存: ${p.actualAvailable})`);
      });
      console.log('');
    });
    
    console.log('\n✅ 检查完成');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllSources();
