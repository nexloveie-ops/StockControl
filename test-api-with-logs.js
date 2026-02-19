const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const category = 'Pre-Owned Devices';
    const url = `http://localhost:8080/api/products?category=${encodeURIComponent(category)}`;
    
    console.log('\nTesting API:', url);
    
    const response = await fetch(url);
    const result = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Total products:', result.data?.length || 0);
    console.log('Summary:', result.summary);
    
    // 查找iPhone 13
    const iphone13Products = result.data.filter(p => 
      p.name && p.name.toLowerCase().includes('iphone') && p.name.toLowerCase().includes('13')
    );
    
    console.log('\n=== iPhone 13 Products ===');
    iphone13Products.forEach(p => {
      console.log(`- ${p.name}:`);
      console.log(`  source: ${p.source}`);
      console.log(`  stockQuantity: ${p.stockQuantity}`);
      console.log(`  serialNumbers: ${p.serialNumbers?.length || 0}`);
      if (p.serialNumbers && p.serialNumbers.length > 0) {
        p.serialNumbers.forEach(sn => {
          console.log(`    - ${sn.serialNumber}: ${sn.status || 'N/A'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
