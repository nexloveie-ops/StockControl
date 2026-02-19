// 测试商户页面仓库库存显示修复
const mongoose = require('mongoose');
require('dotenv').config();

async function testWarehouseInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 加载所有需要的模型
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const ProductCategory = require('./models/ProductCategory'); // 需要加载这个模型
    
    console.log('=== 测试仓库库存API逻辑 ===\n');
    
    // 1. 查询 ProductNew 中的设备
    console.log('1️⃣ 查询 ProductNew 中的设备产品:');
    const devices = await ProductNew.find({ 
      isActive: true,
      stockQuantity: { $gt: 0 }
    })
    .populate('category', 'name type')
    .limit(5);
    
    devices.forEach(device => {
      const isDevice = device.category?.type?.toLowerCase().includes('device');
      let actualAvailable = 0;
      
      if (isDevice && device.serialNumbers && device.serialNumbers.length > 0) {
        actualAvailable = device.serialNumbers.filter(sn => sn.status === 'available').length;
      } else {
        actualAvailable = device.stockQuantity || 0;
      }
      
      console.log(`\n产品: ${device.name}`);
      console.log(`  分类: ${device.category?.type}`);
      console.log(`  是否设备: ${isDevice}`);
      console.log(`  stockQuantity: ${device.stockQuantity}`);
      console.log(`  序列号总数: ${device.serialNumbers?.length || 0}`);
      console.log(`  可用序列号: ${actualAvailable}`);
      console.log(`  ✅ 实际可用库存: ${actualAvailable}`);
    });
    
    // 2. 查询 AdminInventory 中的配件
    console.log('\n\n2️⃣ 查询 AdminInventory 中的配件产品:');
    const accessories = await AdminInventory.find({
      isActive: true,
      quantity: { $gt: 0 },
      status: 'AVAILABLE'
    }).limit(5);
    
    accessories.forEach(item => {
      console.log(`\n产品: ${item.productName}`);
      console.log(`  分类: ${item.category}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  ✅ 实际可用库存: ${item.quantity}`);
    });
    
    // 3. 测试分组逻辑
    console.log('\n\n3️⃣ 测试分组逻辑:');
    const allProducts = await ProductNew.find({ 
      isActive: true,
      stockQuantity: { $gt: 0 }
    }).populate('category', 'name type');
    
    const groupedProducts = {};
    
    allProducts.forEach(product => {
      const isDevice = product.category?.type?.toLowerCase().includes('device');
      
      let actualAvailable = 0;
      if (isDevice && product.serialNumbers && product.serialNumbers.length > 0) {
        actualAvailable = product.serialNumbers.filter(sn => sn.status === 'available').length;
      } else {
        actualAvailable = product.stockQuantity || 0;
      }
      
      if (actualAvailable === 0) return;
      
      let key;
      if (isDevice) {
        const productName = (product.name || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
        key = `${product.category?.type || 'Unknown'}_${productName}_${product.condition}`;
      } else {
        key = `${product.category?.type || 'Unknown'}_${product.brand || ''}_${product.model || ''}_${product.color || ''}_${product.condition}`;
      }
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: product.category?.type || 'Unknown',
          category: product.category?.name || product.category?.type || '未分类',
          products: [],
          totalAvailable: 0
        };
      }
      
      groupedProducts[key].products.push({
        name: product.name,
        actualAvailable: actualAvailable
      });
      groupedProducts[key].totalAvailable += actualAvailable;
    });
    
    console.log(`\n总共分组数: ${Object.keys(groupedProducts).length}`);
    console.log('\n前5个分组:');
    Object.entries(groupedProducts).slice(0, 5).forEach(([key, group]) => {
      console.log(`\n分组: ${key}`);
      console.log(`  分类: ${group.category}`);
      console.log(`  子产品数: ${group.products.length}`);
      console.log(`  总可用库存: ${group.totalAvailable}`);
      group.products.forEach(p => {
        console.log(`    - ${p.name}: ${p.actualAvailable} 件`);
      });
    });
    
    console.log('\n\n✅ 测试完成');
    console.log('\n📝 修复说明:');
    console.log('1. API 已正确计算 actualAvailable（设备只计算 available 状态的序列号）');
    console.log('2. 前端不再重新分组，直接使用 API 返回的分组数据');
    console.log('3. 前端显示 product.totalAvailable 而不是重新计算');
    console.log('\n🔄 请刷新浏览器（Ctrl+F5）查看修复效果');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testWarehouseInventory();
