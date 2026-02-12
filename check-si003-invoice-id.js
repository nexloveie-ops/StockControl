require('dotenv').config();
const mongoose = require('mongoose');

// 加载模型
require('./models/PurchaseInvoice');
require('./models/AdminInventory');

async function checkSI003InvoiceId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const PurchaseInvoice = mongoose.model('PurchaseInvoice');
    
    // 查询SI-003发票
    const invoice = await PurchaseInvoice.findOne({ 
      invoiceNumber: { $regex: /SI-003/i } 
    });
    
    if (invoice) {
      console.log('📄 找到发票:');
      console.log('  _id:', invoice._id.toString());
      console.log('  invoiceNumber:', invoice.invoiceNumber);
      console.log('  supplier:', invoice.supplier);
      console.log('  totalAmount:', invoice.totalAmount);
      console.log('  items数量:', invoice.items?.length || 0);
    } else {
      console.log('❌ 未找到SI-003发票');
      
      // 列出所有发票
      const allInvoices = await PurchaseInvoice.find({}).select('_id invoiceNumber');
      console.log('\n所有发票:');
      allInvoices.forEach(inv => {
        console.log(`  ${inv.invoiceNumber}: ${inv._id}`);
      });
    }

    // 检查AdminInventory中是否有SI-003的产品
    const AdminInventory = mongoose.model('AdminInventory');
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: { $regex: /SI-003/i } 
    });
    
    if (adminProducts.length > 0) {
      console.log(`\n📦 AdminInventory中找到 ${adminProducts.length} 个产品`);
      console.log('发票编号:', adminProducts[0].invoiceNumber);
    } else {
      console.log('\n❌ AdminInventory中未找到SI-003的产品');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSI003InvoiceId();
