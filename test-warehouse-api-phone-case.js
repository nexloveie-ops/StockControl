const axios = require('axios');

async function testWarehouseAPI() {
  try {
    console.log('🔍 测试仓库产品API - Phone Case\n');
    console.log('='.repeat(80));
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (!response.data.success) {
      console.error('❌ API调用失败');
      return;
    }
    
    // 查找 Phone Case 的产品组
    const phoneCaseGroups = response.data.data.filter(group => 
      group.category === 'Phone Case'
    );
    
    console.log(`\n找到 ${phoneCaseGroups.length} 个 Phone Case 产品组\n`);
    
    phoneCaseGroups.forEach((group, index) => {
      console.log(`产品组 ${index + 1}:`);
      console.log(`  分类: ${group.category}`);
      console.log(`  品牌: ${group.brand}`);
      console.log(`  总库存: ${group.totalAvailable}`);
      console.log(`  子产品数量: ${group.products.length}`);
      
      // 统计不同型号和颜色的数量
      const variants = {};
      group.products.forEach(p => {
        const key = `${p.model}_${p.color}`;
        if (!variants[key]) {
          variants[key] = {
            model: p.model,
            color: p.color,
            quantity: 0
          };
        }
        variants[key].quantity += (p.actualAvailable || p.stockQuantity);
      });
      
      console.log(`  变体统计 (共 ${Object.keys(variants).length} 个变体):`);
      Object.values(variants).forEach((v, i) => {
        console.log(`    ${i + 1}. ${v.model} - ${v.color}: 数量 ${v.quantity}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testWarehouseAPI();
