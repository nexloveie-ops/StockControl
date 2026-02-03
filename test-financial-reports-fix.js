const axios = require('axios');

async function testFinancialReports() {
  try {
    console.log('🧪 测试 Financial Reports API - VAT Amount 计算修复\n');
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
    
    // 查找问题发票
    const targetInvoices = ['SI-1769998537832-0002', 'SI-1769998524159-0001'];
    
    for (const invoiceNumber of targetInvoices) {
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
      
      if (invoice) {
        console.log('='.repeat(80));
        console.log(`📋 发票: ${invoice.invoiceNumber}`);
        console.log('='.repeat(80));
        console.log(`客户: ${invoice.partner}`);
        console.log(`日期: ${new Date(invoice.date).toLocaleString()}`);
        console.log(`总金额: €${invoice.totalAmount.toFixed(2)}`);
        console.log(`税额: €${invoice.taxAmount.toFixed(2)} ${invoice.taxAmount > 0 ? '✅' : '❌'}`);
        console.log(`小计: €${invoice.subtotal.toFixed(2)}`);
        console.log();
      } else {
        console.log(`❌ 未找到发票: ${invoiceNumber}\n`);
      }
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
    
    // 验证预期结果
    const invoice1 = invoices.find(inv => inv.invoiceNumber === 'SI-1769998537832-0002');
    const invoice2 = invoices.find(inv => inv.invoiceNumber === 'SI-1769998524159-0001');
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 验证结果');
    console.log('='.repeat(80));
    
    if (invoice1) {
      const expected1 = 84.15;
      const actual1 = invoice1.taxAmount;
      const diff1 = Math.abs(actual1 - expected1);
      console.log(`SI-1769998537832-0002:`);
      console.log(`  预期税额: €${expected1.toFixed(2)}`);
      console.log(`  实际税额: €${actual1.toFixed(2)}`);
      console.log(`  差异: €${diff1.toFixed(2)} ${diff1 < 0.01 ? '✅ 通过' : '❌ 失败'}`);
    }
    
    if (invoice2) {
      const expected2 = 5.61;
      const actual2 = invoice2.taxAmount;
      const diff2 = Math.abs(actual2 - expected2);
      console.log(`\nSI-1769998524159-0001:`);
      console.log(`  预期税额: €${expected2.toFixed(2)}`);
      console.log(`  实际税额: €${actual2.toFixed(2)}`);
      console.log(`  差异: €${diff2.toFixed(2)} ${diff2 < 0.01 ? '✅ 通过' : '❌ 失败'}`);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testFinancialReports();
