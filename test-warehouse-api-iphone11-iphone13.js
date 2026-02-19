const axios = require('axios');

async function testWarehouseAPI() {
  try {
    console.log('🔍 测试仓库产品 API\n');
    console.log('='.repeat(80));
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (!response.data.success) {
      console.error('❌ API 返回失败');
      return;
    }
    
    const allProducts = response.data.data;
    console.log(`📦 总共 ${allProducts.length} 个产品组\n`);
    
    // 查找 iPhone 11
    console.log('📱 iPhone 11:');
    const iphone11Groups = allProducts.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 11'))
    );
    
    console.log(`   找到 ${iphone11Groups.length} 个产品组\n`);
    
    iphone11Groups.forEach((group, index) => {
      console.log(`   产品组 ${index + 1}:`);
      console.log(`     分类: ${group.category}`);
      console.log(`     品牌: ${group.brand}`);
      console.log(`     总库存: ${group.totalAvailable}`);
      console.log(`     子产品数量: ${group.products.length}`);
      console.log(`     子产品:`);
      group.products.forEach((p, i) => {
        console.log(`       ${i + 1}. ${p.name} - 型号: ${p.model || 'N/A'}, 颜色: ${p.color || 'N/A'}, 库存: ${p.actualAvailable || p.stockQuantity}, 来源: ${p.source}`);
      });
      console.log('');
    });
    
    // 查找 iPhone 13
    console.log('📱 iPhone 13:');
    const iphone13Groups = allProducts.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 13') && !p.name.includes('iPhone 13 Pro'))
    );
    
    console.log(`   找到 ${iphone13Groups.length} 个产品组\n`);
    
    iphone13Groups.forEach((group, index) => {
      console.log(`   产品组 ${index + 1}:`);
      console.log(`     分类: ${group.category}`);
      console.log(`     品牌: ${group.brand}`);
      console.log(`     总库存: ${group.totalAvailable}`);
      console.log(`     子产品数量: ${group.products.length}`);
      console.log(`     子产品:`);
      group.products.forEach((p, i) => {
        console.log(`       ${i + 1}. ${p.name} - 型号: ${p.model || 'N/A'}, 颜色: ${p.color || 'N/A'}, 库存: ${p.actualAvailable || p.stockQuantity}, 来源: ${p.source}`);
      });
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testWarehouseAPI();
