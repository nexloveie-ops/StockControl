const axios = require('axios');

async function testWarehouseAPI() {
  try {
    console.log('🧪 测试仓库产品API分组...\n');
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    const result = response.data;
    
    if (!result.success) {
      console.log('❌ API调用失败:', result.error);
      return;
    }
    
    console.log(`✅ API返回 ${result.data.length} 个产品组\n`);
    
    // 找到 Phone Case 分类的产品
    const phoneCaseGroups = result.data.filter(group => 
      group.category === 'Phone Case' || group.productType === 'Phone Case'
    );
    
    console.log(`📱 Phone Case 分类: ${phoneCaseGroups.length} 个产品组\n`);
    
    phoneCaseGroups.forEach((group, index) => {
      console.log(`\n产品组 ${index + 1}:`);
      console.log(`  产品类型: ${group.productType}`);
      console.log(`  分类: ${group.category}`);
      console.log(`  品牌: ${group.brand}`);
      console.log(`  型号: ${group.model}`);
      console.log(`  颜色: ${group.color}`);
      console.log(`  总库存: ${group.totalAvailable}`);
      console.log(`  子产品数量: ${group.products.length}`);
      
      if (group.products.length > 0) {
        console.log(`  子产品列表:`);
        group.products.slice(0, 3).forEach((product, i) => {
          console.log(`    ${i + 1}. ${product.name || product.productName}`);
          console.log(`       型号: ${product.model || 'N/A'}, 颜色: ${product.color || 'N/A'}`);
          console.log(`       库存: ${product.actualAvailable || product.stockQuantity}`);
        });
        if (group.products.length > 3) {
          console.log(`    ... 还有 ${group.products.length - 3} 个产品`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testWarehouseAPI();
