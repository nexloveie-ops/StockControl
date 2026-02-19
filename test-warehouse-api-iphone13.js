const axios = require('axios');

async function testWarehouseAPI() {
  try {
    console.log('🔍 测试仓库产品API - iPhone 13\n');
    console.log('='.repeat(80));
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (!response.data.success) {
      console.error('❌ API调用失败');
      return;
    }
    
    // 查找 iPhone 13 的产品组
    const iphone13Groups = response.data.data.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 13')) &&
      group.category === 'Pre-Owned Devices'
    );
    
    console.log(`\n找到 ${iphone13Groups.length} 个 iPhone 13 产品组\n`);
    
    iphone13Groups.forEach((group, index) => {
      console.log(`产品组 ${index + 1}:`);
      console.log(`  分类: ${group.category}`);
      console.log(`  品牌: ${group.brand}`);
      console.log(`  总库存: ${group.totalAvailable}`);
      console.log(`  子产品数量: ${group.products.length}`);
      console.log(`  子产品:`);
      
      // 按颜色分组统计
      const colorGroups = {};
      group.products.forEach(p => {
        const key = `${p.color}_${p.model}`;
        if (!colorGroups[key]) {
          colorGroups[key] = {
            color: p.color,
            model: p.model,
            count: 0,
            totalQuantity: 0
          };
        }
        colorGroups[key].count++;
        colorGroups[key].totalQuantity += (p.actualAvailable || p.stockQuantity);
      });
      
      Object.values(colorGroups).forEach((colorGroup, i) => {
        console.log(`    ${i + 1}. ${colorGroup.color} ${colorGroup.model}: ${colorGroup.count} 条记录, 总数量 ${colorGroup.totalQuantity}`);
      });
      
      console.log(`\n  详细列表:`);
      group.products.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.name} - 颜色: ${p.color}, 型号: ${p.model}, 数量: ${p.actualAvailable || p.stockQuantity}`);
      });
      console.log('');
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 测试完成');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testWarehouseAPI();
