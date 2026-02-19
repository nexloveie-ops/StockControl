const mongoose = require('mongoose');
require('dotenv').config();

async function testInvoiceCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const invoiceNumber = 'admin-SI-3688';
    
    // 模拟API调用
    const response = await fetch(`http://localhost:8080/api/admin/purchase-orders/${invoiceNumber}`, {
      headers: {
        'Cookie': 'connect.sid=your-session-cookie-here'
      }
    });
    
    if (!response.ok) {
      console.error('❌ API调用失败:', response.status);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📋 发票详情:');
    console.log('发票号:', data.data.invoiceNumber);
    console.log('供应商:', data.data.supplier?.name);
    console.log('\n产品列表:');
    
    data.data.items.forEach((item, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log('  名称:', item.productName);
      console.log('  描述:', item.description);
      console.log('  数量:', item.quantity);
      console.log('  成色:', item.condition || '(无)');
      console.log('  税率:', item.vatRate);
      console.log('  序列号:', item.serialNumbers?.join(', ') || '(无)');
      console.log('  来源:', item.source);
    });
    
    // 检查是否所有产品都有condition字段
    const itemsWithoutCondition = data.data.items.filter(item => !item.condition);
    
    if (itemsWithoutCondition.length > 0) {
      console.log('\n⚠️  以下产品缺少成色信息:');
      itemsWithoutCondition.forEach(item => {
        console.log('  -', item.productName || item.description);
      });
    } else {
      console.log('\n✅ 所有产品都包含成色信息');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testInvoiceCondition();
