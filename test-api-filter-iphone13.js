const fetch = require('node-fetch');

async function testAPI() {
  try {
    const category = 'Pre-Owned Devices';
    const url = `http://localhost:8080/api/products?category=${encodeURIComponent(category)}`;
    
    console.log('Testing API:', url);
    console.log('Expected: Products with stockQuantity > 0 OR quantity > 0');
    
    const response = await fetch(url);
    const result = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Success:', result.success);
    console.log('Total products:', result.data?.length || 0);
    
    // 查找iPhone 13
    const iphone13 = result.data.find(p => p.name === 'iPhone 13');
    
    if (iphone13) {
      console.log('\n❌ iPhone 13 found (should be filtered out):');
      console.log('  _id:', iphone13._id);
      console.log('  source:', iphone13.source);
      console.log('  stockQuantity:', iphone13.stockQuantity);
      console.log('  quantity:', iphone13.quantity);
      console.log('  serialNumbers:', iphone13.serialNumbers?.length || 0);
    } else {
      console.log('\n✅ iPhone 13 not found (correctly filtered)');
    }
    
    // 检查所有stockQuantity=0的产品
    const zeroStockProducts = result.data.filter(p => 
      (p.stockQuantity === 0 || !p.stockQuantity) && (p.quantity === 0 || !p.quantity)
    );
    
    if (zeroStockProducts.length > 0) {
      console.log(`\n⚠️  Found ${zeroStockProducts.length} products with zero stock:`);
      zeroStockProducts.forEach(p => {
        console.log(`  - ${p.name} (source: ${p.source}, stockQuantity: ${p.stockQuantity}, quantity: ${p.quantity})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
