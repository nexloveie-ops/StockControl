const fetch = require('node-fetch');

async function testProductsAPI() {
  try {
    console.log('🔍 测试 /api/products API...\n');
    
    const response = await fetch('http://localhost:3000/api/products');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('📊 API 响应:');
    console.log(`  success: ${result.success}`);
    console.log(`  总产品数: ${result.data?.length || 0}`);
    
    if (result.data && result.data.length > 0) {
      console.log('\n📦 产品来源统计:');
      const sources = {};
      result.data.forEach(p => {
        sources[p.source] = (sources[p.source] || 0) + 1;
      });
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} 个`);
      });
      
      console.log('\n📋 产品分类统计:');
      const categories = {};
      result.data.forEach(p => {
        const cat = p.productType || '未分类';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} 个`);
      });
      
      console.log('\n📝 前5个产品示例:');
      result.data.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name || p.productName} (${p.source})`);
        console.log(`     分类: ${p.productType}, 库存: ${p.stockQuantity || p.quantity}`);
      });
    } else {
      console.log('\n⚠️  没有产品数据');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testProductsAPI();
