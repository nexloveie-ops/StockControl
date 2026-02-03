require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseInvoice = require('./models/PurchaseInvoice');

async function deleteInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const invoiceNumbers = ['SI-001', 'SI-3688'];
    
    console.log('🗑️  准备删除以下发票:');
    console.log('='.repeat(60));
    
    for (const invoiceNumber of invoiceNumbers) {
      // 查找发票
      const invoice = await PurchaseInvoice.findOne({ invoiceNumber });
      
      if (invoice) {
        console.log(`\n找到发票: ${invoiceNumber}`);
        console.log(`  供应商: ${invoice.supplier?.name || '未知'}`);
        console.log(`  总金额: €${invoice.totalAmount?.toFixed(2) || '0.00'}`);
        console.log(`  创建时间: ${invoice.createdAt}`);
        
        // 删除发票
        await PurchaseInvoice.deleteOne({ invoiceNumber });
        console.log(`  ✅ 已删除`);
      } else {
        console.log(`\n⚠️  未找到发票: ${invoiceNumber}`);
      }
    }
    
    // 验证删除结果
    console.log('\n\n📊 验证删除结果:');
    console.log('='.repeat(60));
    const remainingInvoices = await PurchaseInvoice.find();
    console.log(`剩余发票数量: ${remainingInvoices.length}`);
    
    if (remainingInvoices.length > 0) {
      console.log('\n剩余的发票:');
      remainingInvoices.forEach((invoice, index) => {
        console.log(`${index + 1}. ${invoice.invoiceNumber} - ${invoice.supplier?.name || '未知'} - €${invoice.totalAmount?.toFixed(2) || '0.00'}`);
      });
    } else {
      console.log('✅ 所有指定的发票已删除，数据库中没有剩余发票');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

deleteInvoices();
