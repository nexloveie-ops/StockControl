// 测试仓库产品分组修复
const mongoose = require('mongoose');
require('dotenv').config();

async function testGrouping() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const ProductCategory = require('./models/ProductCategory');
    
    console.log('=== 测试设备产品分组逻辑 ===\n');
    
    // 查询所有iPhone 14
    const iphone14Products = await ProductNew.find({ 
      name: /iPhone 14/i,
      isActive: true
    }).populate('category', 'name type');
    
    console.log(`📱 找到 ${iphone14Products.length} 个 iPhone 14 产品:\n`);
    
    // 模拟API的分组逻辑
    const groupedProducts = {};
    
    iphone14Products.forEach(product => {
      const isDevice = product.category?.type?.toLowerCase().includes('device');
      
      // 计算实际可用库存
      let actualAvailable = 0;
      if (isDevice && product.serialNumbers && product.serialNumbers.length > 0) {
        actualAvailable = product.serialNumbers.filter(sn => sn.status === 'available').length;
      } else {
        actualAvailable = product.stockQuantity || 0;
      }
      
      console.log(`产品ID: ${product._id}`);
      console.log(`  名称: ${product.name}`);
      console.log(`  颜色: ${product.color || '无'}`);
      console.log(`  成色: ${product.condition}`);
      console.log(`  stockQuantity: ${product.stockQuantity}`);
      console.log(`  序列号总数: ${product.serialNumbers?.length || 0}`);
      console.log(`  可用序列号: ${actualAvailable}`);
      
      if (actualAvailable === 0) {
        console.log(`  ⚠️  跳过（无可用库存）\n`);
        return;
      }
      
      // 新的分组逻辑：包含颜色
      const productName = (product.name || '').replace(/\d+(GB|TB)/gi, '').trim().replace(/\s+/g, '');
      const key = `${product.category?.type || 'Unknown'}_${productName}_${product.color || 'NoColor'}_${product.condition}`;
      
      console.log(`  分组Key: ${key}`);
      console.log(`  ✅ 可用库存: ${actualAvailable}\n`);
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          productType: product.category?.type || 'Unknown',
          category: product.category?.name || product.category?.type || '未分类',
          brand: product.brand || '',
          model: product.model || '',
          color: product.color || '',
          products: [],
          totalAvailable: 0
        };
      }
      
      groupedProducts[key].products.push({
        _id: product._id,
        name: product.name,
        color: product.color,
        actualAvailable: actualAvailable
      });
      groupedProducts[key].totalAvailable += actualAvailable;
    });
    
    console.log('\n=== 分组结果 ===\n');
    console.log(`总共 ${Object.keys(groupedProducts).length} 个分组:\n`);
    
    Object.entries(groupedProducts).forEach(([key, group]) => {
      console.log(`分组: ${key}`);
      console.log(`  颜色: ${group.color || '无'}`);
      console.log(`  子产品数: ${group.products.length}`);
      console.log(`  总可用库存: ${group.totalAvailable}`);
      console.log(`  子产品列表:`);
      group.products.forEach((p, index) => {
        console.log(`    ${index + 1}. ${p.name} - ${p.color || '无颜色'} (库存: ${p.actualAvailable})`);
      });
      console.log('');
    });
    
    console.log('\n✅ 测试完成');
    console.log('\n📝 修复说明:');
    console.log('1. 设备产品现在按"产品名称+颜色+成色"分组');
    console.log('2. 不同颜色的iPhone 14会显示为不同的产品');
    console.log('3. 相同颜色的iPhone 14会合并显示总库存');
    console.log('\n🔄 请刷新浏览器（Ctrl+F5）查看修复效果');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testGrouping();
