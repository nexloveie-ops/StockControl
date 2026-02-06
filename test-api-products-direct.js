const http = require('http');

function testAPI() {
  console.log('🧪 直接测试 /api/products API\n');
  console.log('服务器: http://localhost:3000');
  console.log('=' .repeat(60));
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    console.log(`📡 响应状态: ${res.statusCode}`);
    console.log(`📡 响应头:`, res.headers);
    console.log('');
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        console.log('✅ API 响应成功\n');
        
        if (result.summary) {
          console.log('📊 统计信息:');
          console.log(`   ProductNew: ${result.summary.productNew} 个`);
          console.log(`   AdminInventory: ${result.summary.adminInventory} 个`);
          console.log(`   总计: ${result.summary.total} 个`);
        }
        
        if (result.data && result.data.length > 0) {
          console.log(`\n📦 返回产品: ${result.data.length} 个\n`);
          
          // 按分类统计
          const byCategory = {};
          result.data.forEach(p => {
            const cat = p.productType || p.category?.type || '未分类';
            if (!byCategory[cat]) {
              byCategory[cat] = [];
            }
            byCategory[cat].push(p);
          });
          
          console.log('按分类分组:');
          Object.entries(byCategory).forEach(([cat, products]) => {
            console.log(`\n  📁 ${cat}: ${products.length} 个产品`);
            
            // 显示前3个产品
            products.slice(0, 3).forEach((p, i) => {
              console.log(`     ${i + 1}. ${p.name || 'Unknown'}`);
              console.log(`        型号: ${p.model || '-'}, 颜色: ${p.color || '-'}`);
              console.log(`        库存: ${p.stockQuantity || p.quantity || 0}, 来源: ${p.source || 'Unknown'}`);
            });
            
            if (products.length > 3) {
              console.log(`     ... 还有 ${products.length - 3} 个产品`);
            }
          });
          
          // 查找 iPhone Clear Case
          const iPhoneCases = result.data.filter(p => 
            p.name && p.name.includes('iPhone Clear Case')
          );
          
          if (iPhoneCases.length > 0) {
            console.log(`\n\n🎯 找到 iPhone Clear Case: ${iPhoneCases.length} 个`);
            console.log('   ✅ API 正常返回 AdminInventory 数据');
          } else {
            console.log('\n\n❌ 未找到 iPhone Clear Case');
            console.log('   可能的原因:');
            console.log('   1. API 没有正确查询 AdminInventory');
            console.log('   2. 数据格式转换有问题');
          }
        } else {
          console.log('\n❌ API 返回空数据');
        }
        
        console.log('\n\n💡 如果 API 返回正确但浏览器看不到:');
        console.log('   1. 清除浏览器缓存 (Ctrl+Shift+Delete)');
        console.log('   2. 硬刷新页面 (Ctrl+Shift+R 或 Ctrl+F5)');
        console.log('   3. 打开浏览器开发者工具 (F12)');
        console.log('   4. 查看 Network 标签，确认 /api/products 请求');
        console.log('   5. 查看 Console 标签，检查 JavaScript 错误');
        
      } catch (error) {
        console.error('❌ 解析响应失败:', error.message);
        console.log('原始响应:', data.substring(0, 500));
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ 请求失败:', error.message);
    console.log('\n请确认:');
    console.log('   1. 服务器正在运行 (http://localhost:3000)');
    console.log('   2. 端口 3000 没有被占用');
  });
  
  req.end();
}

// 等待一下确保服务器准备好
setTimeout(testAPI, 1000);
