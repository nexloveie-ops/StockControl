const fetch = require('node-fetch');

async function testOrderDetailsAPI() {
  try {
    console.log('测试订单详情API...\n');
    
    // 测试仓库管理员查看
    const response = await fetch('http://localhost:3000/api/warehouse/orders/698d3e2c6ea0dc973490355c?userId=warehouse1');
    const result = await response.json();
    
    if (result.success) {
      const order = result.data;
      console.log('订单号:', order.orderNumber);
      console.log('商户ID:', order.merchantId);
      console.log('商户名称:', order.merchantName);
      console.log('\n商户公司信息:');
      console.log(JSON.stringify(order.merchantCompanyInfo, null, 2));
      
      console.log('\n产品列表:');
      order.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   税率分类: ${item.taxClassification}`);
        console.log(`   税额: €${item.taxAmount?.toFixed(2) || '0.00'}`);
      });
      
      console.log('\n订单总计:');
      console.log(`  小计: €${order.subtotal?.toFixed(2)}`);
      console.log(`  税额: €${order.taxAmount?.toFixed(2)}`);
      console.log(`  总计: €${order.totalAmount?.toFixed(2)}`);
    } else {
      console.error('API错误:', result.error);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testOrderDetailsAPI();
