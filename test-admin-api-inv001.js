const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('测试 Admin API: /api/admin/purchase-orders/69952a28916340abda45c932\n');
    
    const response = await fetch('http://localhost:8080/api/admin/purchase-orders/69952a28916340abda45c932');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ API 调用成功\n');
      console.log('发票号:', result.data.invoiceNumber);
      console.log('Items 数量:', result.data.items.length);
      console.log('PurchaseInvoice count:', result.data.purchaseInvoiceCount);
      console.log('AdminInventory count:', result.data.adminInventoryCount);
      console.log('\nItems 详情:');
      result.data.items.forEach((item, idx) => {
        console.log(`\nItem ${idx + 1}:`);
        console.log('  productName:', item.productName);
        console.log('  description:', item.description);
        console.log('  serialNumbers:', item.serialNumbers);
        console.log('  condition:', item.condition);
        console.log('  vatRate:', item.vatRate);
        console.log('  source:', item.source);
      });
    } else {
      console.log('❌ API 调用失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testAPI();
