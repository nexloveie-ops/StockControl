require('dotenv').config();
const mongoose = require('mongoose');

async function deleteDuplicateSI001() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    // 查询SI-001
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-001' });
    
    if (invoice) {
      console.log('📋 找到PurchaseInvoice中的SI-001:');
      console.log(`  ID: ${invoice._id}`);
      console.log(`  发票号: ${invoice.invoiceNumber}`);
      console.log(`  总金额: €${invoice.totalAmount}`);
      console.log(`  税额: €${invoice.taxAmount}`);
      console.log(`  产品数: ${invoice.items?.length || 0}`);
      
      console.log('\n⚠️  这是重复的错误数据，正确的数据在AdminInventory表中');
      console.log('🗑️  删除PurchaseInvoice中的SI-001...\n');
      
      await PurchaseInvoice.deleteOne({ _id: invoice._id });
      
      console.log('✅ 已删除PurchaseInvoice中的SI-001');
      console.log('✅ 现在Invoice Details将使用AdminInventory中的正确数据');
    } else {
      console.log('❌ 在PurchaseInvoice中未找到SI-001');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

deleteDuplicateSI001();
