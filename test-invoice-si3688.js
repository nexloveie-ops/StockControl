const fetch = require('node-fetch');

async function testInvoiceSI3688() {
  try {
    console.log('测试发票 SI-3688\n');
    
    // 首先查找这个发票的ID
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-3688' }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到发票 SI-3688');
      await mongoose.disconnect();
      return;
    }
    
    console.log('✅ 找到发票:');
    console.log(`  _id: ${invoice._id}`);
    console.log(`  invoiceNumber: ${invoice.invoiceNumber}`);
    console.log(`  items数量: ${invoice.items.length}`);
    console.log('');
    
    await mongoose.disconnect();
    
    // 测试API
    console.log('测试 API: /api/admin/purchase-orders/' + invoice._id + '\n');
    
    const response = await fetch(`http://localhost:8080/api/admin/purchase-orders/${invoice._id}`);
    
    if (!response.ok) {
      console.log(`❌ API返回错误: ${response.status}`);
      const text = await response.text();
      console.log('错误内容:', text);
      return;
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ API调用成功\n');
      console.log('发票号:', result.data.invoiceNumber);
      console.log('Items数量:', result.data.items.length);
      console.log('PurchaseInvoice count:', result.data.purchaseInvoiceCount);
      console.log('AdminInventory count:', result.data.adminInventoryCount);
    } else {
      console.log('❌ API返回失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('堆栈:', error.stack);
  }
}

testInvoiceSI3688();
