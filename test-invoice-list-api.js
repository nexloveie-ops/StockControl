require('dotenv').config();
const axios = require('axios');

async function testInvoiceListAPI() {
  try {
    const supplierId = '69852601b9f253cade6e4c43'; // Mobigo Limited
    const url = `http://localhost:3000/api/admin/suppliers/${supplierId}/invoices`;
    
    console.log(`\n📡 调用API: ${url}\n`);
    
    const response = await axios.get(url);
    
    if (response.data.success) {
      console.log(`✅ API调用成功\n`);
      
      const invoices = response.data.data;
      console.log(`找到 ${invoices.length} 个发票\n`);
      
      invoices.forEach((invoice, index) => {
        console.log(`发票 ${index + 1}:`);
        console.log(`  发票号: ${invoice.invoiceNumber}`);
        console.log(`  supplier类型: ${typeof invoice.supplier}`);
        console.log(`  supplier._id: ${invoice.supplier?._id}`);
        console.log(`  supplier.name: ${invoice.supplier?.name}`);
        console.log(`  items数量: ${invoice.items?.length || 0}`);
        console.log(`  adminInventoryCount: ${invoice.adminInventoryCount}`);
        console.log(`  purchaseInvoiceCount: ${invoice.purchaseInvoiceCount}`);
        console.log(`  小计(不含税): €${invoice.subtotal?.toFixed(2)}`);
        console.log(`  税额: €${invoice.taxAmount?.toFixed(2)}`);
        console.log(`  总金额(含税): €${invoice.totalAmount?.toFixed(2)}`);
        console.log('');
      });
    } else {
      console.log(`❌ API返回失败: ${response.data.error}`);
    }
  } catch (error) {
    console.error('❌ API调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testInvoiceListAPI();
