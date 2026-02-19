const fetch = require('node-fetch');

async function testAPI() {
  try {
    const category = 'Pre-Owned Devices';
    const url = `http://localhost:8080/api/products?category=${encodeURIComponent(category)}`;
    
    console.log('Testing API:', url);
    
    const response = await fetch(url);
    const result = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Success:', result.success);
    console.log('Total products:', result.data?.length || 0);
    
    // 查找iPhone 13相关产品
    const iphone13Products = result.data.filter(p => 
      p.name && p.name.toLowerCase().includes('iphone') && p.name.toLowerCase().includes('13')
    );
    
    console.log('\n=== iPhone 13 Products ===');
    console.log('Found:', iphone13Products.length);
    
    iphone13Products.forEach((p, idx) => {
      console.log(`\n[${idx + 1}] ${p.name}:`);
      console.log('  _id:', p._id);
      console.log('  source:', p.source);
      console.log('  model:', p.model);
      console.log('  color:', p.color);
      console.log('  stockQuantity:', p.stockQuantity);
      console.log('  quantity:', p.quantity);
      console.log('  serialNumbers:', p.serialNumbers?.length || 0);
      console.log('  hasVariants check:', p.source === 'AdminInventory' && (p.model || p.color));
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
