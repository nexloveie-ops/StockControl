const http = require('http');

async function testProductsAPI() {
  try {
    console.log('🔍 测试产品API...\n');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/products?category=Pre-Owned%20Devices',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = JSON.parse(data);
        
        console.log(`✅ API返回 ${result.data.length} 个产品\n`);
        
        result.data.forEach(product => {
          console.log(`📱 ${product.name}`);
          console.log(`   数量: ${product.stockQuantity}`);
          console.log(`   序列号数组: ${product.serialNumbers ? `存在 (${product.serialNumbers.length}个)` : '不存在'}`);
          
          if (product.serialNumbers && product.serialNumbers.length > 0) {
            console.log(`   序列号列表:`);
            product.serialNumbers.forEach((sn, index) => {
              console.log(`     ${index + 1}. ${sn.serialNumber} - 状态: ${sn.status}${sn.color ? ` - 颜色: ${sn.color}` : ''}`);
            });
          }
          console.log('');
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 错误:', error.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testProductsAPI();
