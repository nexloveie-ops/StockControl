// 测试批量创建产品变体API

const API_BASE = 'http://localhost:3000/api';

async function testBatchCreateVariants() {
  console.log('🧪 测试批量创建产品变体...\n');
  
  // 测试数据：iPhone Clear Case
  const testData = {
    merchantId: 'admin',  // 使用admin账号测试
    productName: 'iPhone Clear Case',
    category: 'Phone Case',
    brand: 'Generic',
    dimension1Label: 'Model',
    dimension1Values: ['iPhone 13', 'iPhone 14', 'iPhone 14 Pro'],
    dimension2Label: 'Color',
    dimension2Values: ['Clear', 'Black', 'Blue'],
    costPrice: 5.00,
    wholesalePrice: 8.00,
    retailPrice: 12.00,
    taxClassification: 'VAT_23',
    condition: 'BRAND_NEW',
    initialQuantity: 0,
    notes: '批量创建测试'
  };
  
  console.log('📦 测试数据:');
  console.log(`   商户: ${testData.merchantId}`);
  console.log(`   产品名称: ${testData.productName}`);
  console.log(`   分类: ${testData.category}`);
  console.log(`   ${testData.dimension1Label}: ${testData.dimension1Values.join(', ')}`);
  console.log(`   ${testData.dimension2Label}: ${testData.dimension2Values.join(', ')}`);
  console.log(`   预期创建: ${testData.dimension1Values.length} × ${testData.dimension2Values.length} = ${testData.dimension1Values.length * testData.dimension2Values.length} 个变体\n`);
  
  try {
    const response = await fetch(`${API_BASE}/admin/inventory/batch-create-variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 批量创建成功!');
      console.log(`   创建数量: ${result.data.created}`);
      console.log(`   商户: ${result.data.merchantId}`);
      console.log(`   产品名称: ${result.data.productName}`);
      console.log(`   维度1数量: ${result.data.dimension1Count}`);
      console.log(`   维度2数量: ${result.data.dimension2Count}\n`);
      
      console.log('📋 创建的变体列表:');
      result.data.variants.forEach((variant, index) => {
        console.log(`   ${index + 1}. ${variant.productName} - ${variant.model} - ${variant.color}`);
        console.log(`      价格: €${variant.retailPrice.toFixed(2)}, 库存: ${variant.quantity}`);
      });
    } else {
      console.error('❌ 创建失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

// 运行测试
testBatchCreateVariants();
