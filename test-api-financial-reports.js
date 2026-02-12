// 直接测试Financial Reports API
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/reports/financial?startDate=2026-01-01&endDate=2026-02-28&type=all',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 测试API: GET /api/admin/reports/financial');
console.log(`   参数: startDate=2026-01-01, endDate=2026-02-28, type=all\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success && result.data) {
        const invoices = result.data.invoices;
        console.log(`✅ API返回成功，共 ${invoices.length} 条发票记录\n`);
        
        // 查找SI-001
        const si001 = invoices.find(inv => inv.invoiceNumber === 'SI-001');
        
        if (si001) {
          console.log('✅ 找到SI-001:');
          console.log(`   _id: ${si001._id}`);
          console.log(`   invoiceNumber: ${si001.invoiceNumber}`);
          console.log(`   type: ${si001.type}`);
          console.log(`   partner: ${si001.partner}`);
          console.log(`   totalAmount: €${si001.totalAmount.toFixed(2)}`);
          console.log(`   taxAmount: €${si001.taxAmount.toFixed(2)}`);
          console.log(`   date: ${si001.date}`);
        } else {
          console.log('❌ API返回的发票列表中没有SI-001\n');
          
          // 显示所有采购发票
          const purchaseInvoices = invoices.filter(inv => inv.type === 'purchase');
          console.log(`📋 采购发票列表 (共${purchaseInvoices.length}条):`);
          purchaseInvoices.forEach(inv => {
            console.log(`   ${inv.invoiceNumber} - ${inv.partner} - €${inv.totalAmount.toFixed(2)}`);
          });
        }
      } else {
        console.log('❌ API返回失败:', result);
      }
    } catch (error) {
      console.error('❌ 解析响应失败:', error);
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error);
});

req.end();
