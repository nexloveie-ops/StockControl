const fetch = require('node-fetch');

async function testSalesAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/merchant/sales?merchantId=Mobile123');
    const result = await response.json();
    
    console.log('API 响应成功:', result.success);
    console.log('销售记录总数:', result.data.length);
    console.log('\n前3条销售记录:\n');
    
    result.data.slice(0, 3).forEach((sale, index) => {
      console.log(`\n========== 销售记录 ${index + 1} ==========`);
      console.log('ID:', sale._id);
      console.log('日期:', sale.date);
      console.log('状态:', sale.status);
      console.log('退款日期:', sale.refundDate);
      console.log('总金额:', sale.totalAmount);
      console.log('项目数:', sale.items.length);
      
      sale.items.forEach((item, i) => {
        console.log(`  项目 ${i + 1}:`, item.productName);
        console.log('    价格:', item.price);
        console.log('    维修订单ID:', item.repairOrderId);
      });
    });
    
  } catch (error) {
    console.error('错误:', error);
  }
}

testSalesAPI();
