const axios = require('axios');

async function testWarehouseAPI() {
  try {
    console.log('🔍 完整测试仓库产品API\n');
    console.log('='.repeat(80));
    
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    
    if (!response.data.success) {
      console.error('❌ API调用失败');
      return;
    }
    
    console.log('\n✅ API调用成功\n');
    console.log(`总产品组数: ${response.data.data.length}`);
    console.log(`ProductNew 产品数: ${response.data.summary.productNew}`);
    console.log(`AdminInventory 产品数: ${response.data.summary.adminInventory}`);
    
    // 测试1: Phone Case 配件
    console.log('\n' + '='.repeat(80));
    console.log('测试1: Phone Case 配件合并');
    console.log('='.repeat(80));
    const phoneCaseGroups = response.data.data.filter(g => g.category === 'Phone Case');
    console.log(`✓ Phone Case 产品组数: ${phoneCaseGroups.length} (期望: 1)`);
    if (phoneCaseGroups.length > 0) {
      console.log(`✓ 变体数量: ${phoneCaseGroups[0].products.length} (期望: 42)`);
      console.log(`✓ 总库存: ${phoneCaseGroups[0].totalAvailable}`);
    }
    
    // 测试2: iPhone 11 不同颜色
    console.log('\n' + '='.repeat(80));
    console.log('测试2: iPhone 11 不同颜色显示');
    console.log('='.repeat(80));
    const iphone11Groups = response.data.data.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 11')) &&
      group.category === 'Pre-Owned Devices'
    );
    if (iphone11Groups.length > 0) {
      const colors = [...new Set(iphone11Groups[0].products.map(p => p.color))];
      console.log(`✓ iPhone 11 产品组数: ${iphone11Groups.length} (期望: 1)`);
      console.log(`✓ 子产品数: ${iphone11Groups[0].products.length} (期望: 3)`);
      console.log(`✓ 颜色: ${colors.join(', ')} (期望: Yellow, Red, Blue)`);
      iphone11Groups[0].products.forEach(p => {
        console.log(`  - ${p.color}: 数量 ${p.actualAvailable || p.stockQuantity}`);
      });
    }
    
    // 测试3: iPhone 14 White 合并
    console.log('\n' + '='.repeat(80));
    console.log('测试3: iPhone 14 White 相同颜色合并');
    console.log('='.repeat(80));
    const iphone14Groups = response.data.data.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 14')) &&
      group.category === 'Pre-Owned Devices'
    );
    if (iphone14Groups.length > 0) {
      const whiteProducts = iphone14Groups[0].products.filter(p => 
        p.color && p.color.toLowerCase() === 'white'
      );
      console.log(`✓ iPhone 14 产品组数: ${iphone14Groups.length} (期望: 1)`);
      console.log(`✓ White 颜色产品数: ${whiteProducts.length} (期望: 1)`);
      if (whiteProducts.length > 0) {
        console.log(`✓ White 颜色总数量: ${whiteProducts[0].actualAvailable || whiteProducts[0].stockQuantity} (期望: 2)`);
      }
      
      console.log('\n  所有 iPhone 14 子产品:');
      iphone14Groups[0].products.forEach(p => {
        console.log(`  - ${p.color} ${p.model}: 数量 ${p.actualAvailable || p.stockQuantity}`);
      });
    }
    
    // 测试4: 已售产品不显示
    console.log('\n' + '='.repeat(80));
    console.log('测试4: 已售产品不显示');
    console.log('='.repeat(80));
    const iphone15PlusGroups = response.data.data.filter(group => 
      group.products.some(p => p.name && p.name.includes('iPhone 15 Plus')) &&
      group.category === 'Pre-Owned Devices'
    );
    console.log(`✓ iPhone 15 Plus 产品组数: ${iphone15PlusGroups.length} (期望: 0，因为所有序列号已售出)`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 所有测试完成');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testWarehouseAPI();
