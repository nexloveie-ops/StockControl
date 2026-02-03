require('dotenv').config();
const mongoose = require('mongoose');

async function updateSalesInvoiceCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    // 查找所有销售发票
    const invoices = await SalesInvoice.find({});
    console.log(`找到 ${invoices.length} 个销售发票\n`);
    
    let updatedCount = 0;
    
    for (const invoice of invoices) {
      let needsUpdate = false;
      
      // 遍历每个产品项
      for (const item of invoice.items) {
        // 如果没有condition字段，从产品中获取
        if (!item.condition) {
          const product = await ProductNew.findById(item.product);
          if (product && product.condition) {
            item.condition = product.condition;
            needsUpdate = true;
            console.log(`发票 ${invoice.invoiceNumber} - 产品 ${item.description}: 添加成色 "${product.condition}"`);
          }
        }
      }
      
      // 保存更新
      if (needsUpdate) {
        await invoice.save();
        updatedCount++;
      }
    }
    
    console.log(`\n✅ 更新完成！共更新 ${updatedCount} 个发票`);
    
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

updateSalesInvoiceCondition();
