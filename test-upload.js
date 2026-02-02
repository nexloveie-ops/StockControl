const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testImageRecognition() {
  try {
    // 创建一个简单的测试图片文件（实际上是文本，但设置正确的MIME类型）
    const testContent = 'This is a test file for image recognition';
    fs.writeFileSync('test-invoice.jpg', testContent);
    
    // 创建FormData
    const form = new FormData();
    form.append('invoice', fs.createReadStream('test-invoice.jpg'), {
      filename: 'mobile-parts-invoice.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('发送测试请求到图片识别API...');
    
    const response = await fetch('http://localhost:3000/api/admin/recognize-invoice', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    // 清理测试文件
    fs.unlinkSync('test-invoice.jpg');
    
    if (result.success) {
      console.log('✅ 图片识别API工作正常');
      console.log('供应商:', result.data.supplier.name);
      console.log('产品数量:', result.data.products.length);
      
      // 测试不同文件名
      console.log('\n=== 测试不同文件名 ===');
      await testDifferentFilenames();
    } else {
      console.log('❌ 图片识别API返回错误:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function testDifferentFilenames() {
  const testFiles = [
    'techsource-invoice.jpg',
    'mobile-parts-bill.jpg', 
    'electronics-order.jpg',
    'digital-components.jpg',
    'random-supplier.jpg'
  ];
  
  for (const filename of testFiles) {
    try {
      fs.writeFileSync(filename, 'test content');
      
      const form = new FormData();
      form.append('invoice', fs.createReadStream(filename), {
        filename: filename,
        contentType: 'image/jpeg'
      });
      
      const response = await fetch('http://localhost:3000/api/admin/recognize-invoice', {
        method: 'POST',
        body: form
      });
      
      const result = await response.json();
      
      console.log(`文件名: ${filename}`);
      console.log(`供应商: ${result.data.supplier.name}`);
      console.log(`置信度: ${result.data.supplier.confidence}%`);
      console.log('---');
      
      fs.unlinkSync(filename);
    } catch (error) {
      console.error(`测试文件 ${filename} 失败:`, error.message);
    }
  }
}

testImageRecognition();