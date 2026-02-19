const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 测试仓库产品API...\n');
    
    const response = await fetch('http://localhost:8080/api/merchant/warehouse-products');
    const result = await response.json();
    
    console.log('✅ API响应成功');
    console.log('📊 返回数据统计:');
    console.log(`   - 产品组数量: ${result.data.length}`);
    console.log(`   - ProductNew: ${result.summary.productNew}`);
    console.log(`   - AdminInventory: ${result.summary.adminInventory}`);
    console.log(`   - 总分组: ${result.summary.totalGroups}\n`);
    
    console.log('📦 各产品组详情:');
    result.data.forEach((group, index) => {
      console.log(`\n${index + 1}. ${group.category}`);
      console.log(`   品牌: ${group.brand || 'N/A'}`);
      console.log(`   型号: ${group.model || 'N/A'}`);
      console.log(`   颜色: ${group.color || 'N/A'}`);
      console.log(`   总可用数量: ${group.totalAvailable}`);
      console.log(`   产品数: ${group.products.length}`);
      console.log(`   来源: ${group.source}`);
      
      // 显示每个产品的详细信息
      group.products.forEach((product, pIndex) => {
        console.log(`     ${pIndex + 1}. ${product.name || product.productName}`);
        console.log(`        库存: ${product.actualAvailable || product.stockQuantity}`);
        console.log(`        来源: ${product.source || 'N/A'}`);
      });
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPI();
