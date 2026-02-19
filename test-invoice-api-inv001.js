// 测试发票详情API
const axios = require('axios');

async function testInvoiceAPI() {
  try {
    console.log('🔍 测试发票详情API\n');
    
    // 使用发票ID
    const invoiceId = '69952a28916340abda45c932';
    
    const response = await axios.get(
      `http://localhost:8080/api/purchase-orders/${invoiceId}`
    );
    
    console.log('✅ API响应成功\n');
    console.log('发票号:', response.data.data.invoiceNumber);
    console.log('供应商:', response.data.data.supplier.name);
    console.log('产品数量:', response.data.data.items.length);
    console.log('\n产品明细:');
    
    response.data.data.items.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.productName || item.description}`);
      console.log(`   description: ${item.description || 'N/A'}`);
      console.log(`   productName: ${item.productName || 'N/A'}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   单价: €${item.unitCost}`);
      console.log(`   总价: €${item.totalCost}`);
      console.log(`   税率: ${item.vatRate}`);
      console.log(`   成色: ${item.condition || 'N/A'}`);
      console.log(`   序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
      console.log(`   来源: ${item.source}`);
    });
    
    console.log('\n统计:');
    console.log(`  PurchaseInvoice items: ${response.data.data.purchaseInvoiceCount}`);
    console.log(`  AdminInventory items: ${response.data.data.adminInventoryCount}`);
    console.log(`  总计: ${response.data.data.items.length}`);
    
  } catch (error) {
    console.error('❌ API调用失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testInvoiceAPI();
