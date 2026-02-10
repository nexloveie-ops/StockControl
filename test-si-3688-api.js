require('dotenv').config();
const axios = require('axios');

async function testSI3688API() {
  try {
    // First, find the supplier ID for Xtreme Tech Ltd
    const suppliersResponse = await axios.get('http://localhost:3000/api/admin/suppliers');
    const suppliers = suppliersResponse.data.data;
    const xtremeSupplier = suppliers.find(s => s.name === 'Xtreme Tech Ltd');
    
    if (!xtremeSupplier) {
      console.log('❌ 未找到 Xtreme Tech Ltd 供货商');
      return;
    }
    
    console.log(`✅ 找到供货商: ${xtremeSupplier.name} (${xtremeSupplier._id})\n`);
    
    // Get invoices for this supplier
    const invoicesResponse = await axios.get(`http://localhost:3000/api/admin/suppliers/${xtremeSupplier._id}/invoices`);
    const invoices = invoicesResponse.data.data;
    
    const si3688 = invoices.find(inv => inv.invoiceNumber === 'SI-3688');
    
    if (!si3688) {
      console.log('❌ 未找到SI-3688发票');
      console.log(`找到的发票: ${invoices.map(i => i.invoiceNumber).join(', ')}`);
      return;
    }
    
    console.log('=== API返回的SI-3688数据 ===');
    console.log(`发票号: ${si3688.invoiceNumber}`);
    console.log(`供货商: ${si3688.supplier?.name || 'N/A'}`);
    console.log(`items数量: ${si3688.items?.length || 0}`);
    console.log(`小计(不含税): €${si3688.subtotal?.toFixed(2)}`);
    console.log(`税额: €${si3688.taxAmount?.toFixed(2)}`);
    console.log(`总金额(含税): €${si3688.totalAmount?.toFixed(2)}`);
    console.log(`adminInventoryCount: ${si3688.adminInventoryCount}`);
    console.log(`purchaseInvoiceCount: ${si3688.purchaseInvoiceCount}`);
    
    console.log('\n前5个items:');
    si3688.items?.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.product?.name || item.productName || 'N/A'}`);
      console.log(`     数量: ${item.quantity}, 单价: €${item.unitCost}, 税率: ${item.vatRate}`);
      console.log(`     含税总价: €${item.totalCostIncludingTax?.toFixed(2) || item.totalCost?.toFixed(2)}`);
      console.log(`     不含税: €${item.totalCostExcludingTax?.toFixed(2) || 'N/A'}, 税额: €${item.taxAmount?.toFixed(2) || 0}`);
    });
    
  } catch (error) {
    console.error('❌ API调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testSI3688API();
