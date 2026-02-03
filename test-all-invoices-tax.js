const axios = require('axios');

async function testAllInvoices() {
  try {
    console.log('🧪 测试所有发票的税额计算\n');
    console.log('='.repeat(80));
    
    // 测试 Financial Reports API
    const response = await axios.get('http://localhost:3000/api/admin/reports/financial', {
      params: {
        type: 'sales'
      }
    });
    
    if (!response.data.success) {
      console.error('❌ API 调用失败');
      return;
    }
    
    const invoices = response.data.data.invoices;
    const summary = response.data.data.summary;
    
    console.log(`\n📊 找到 ${invoices.length} 个销售记录\n`);
    
    // 显示所有发票
    for (const invoice of invoices) {
      console.log('='.repeat(80));
      console.log(`📋 发票: ${invoice.invoiceNumber}`);
      console.log('='.repeat(80));
      console.log(`类型: ${invoice.subType === 'retail' ? '零售' : '批发'}`);
      console.log(`客户: ${invoice.partner}`);
      console.log(`日期: ${new Date(invoice.date).toLocaleString()}`);
      console.log(`总金额: €${invoice.totalAmount.toFixed(2)}`);
      console.log(`税额: €${invoice.taxAmount.toFixed(2)}`);
      console.log(`小计: €${invoice.subtotal.toFixed(2)}`);
      console.log();
    }
    
    console.log('='.repeat(80));
    console.log('📊 汇总统计');
    console.log('='.repeat(80));
    console.log(`总销售金额: €${summary.totalSalesAmount.toFixed(2)}`);
    console.log(`总销售税额: €${summary.totalSalesTax.toFixed(2)}`);
    console.log(`总批发金额: €${summary.totalWholesaleAmount.toFixed(2)}`);
    console.log(`总采购金额: €${summary.totalPurchaseAmount.toFixed(2)}`);
    console.log(`总采购税额: €${summary.totalPurchaseTax.toFixed(2)}`);
    console.log(`应缴税额: €${summary.totalTaxPayable.toFixed(2)}`);
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testAllInvoices();
