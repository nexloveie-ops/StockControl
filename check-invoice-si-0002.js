const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    
    const invoiceNumber = 'SI-1771434662304-0002';
    
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到发票');
      return;
    }
    
    console.log(`\n📋 销售发票: ${invoiceNumber}`);
    console.log(`总金额: €${invoice.totalAmount}`);
    console.log(`税额: €${invoice.taxAmount || 0}`);
    console.log(`\n产品明细:\n`);
    
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      
      console.log(`产品 ${i + 1}:`);
      console.log(`  发票中的税率: ${item.vatRate}`);
      console.log(`  发票中的税额: €${item.taxAmount || 0}`);
      console.log(`  销售价: €${item.totalPrice || 0}`);
      
      // 查找产品
      const product = await ProductNew.findById(item.product);
      if (product) {
        console.log(`  ProductNew中的税率: ${product.vatRate}`);
        console.log(`  产品名称: ${product.name}`);
        console.log(`  成本价: €${product.costPrice || 0}`);
        console.log(`  批发价: €${product.wholesalePrice || 0}`);
        console.log(`  序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
        
        // 计算应该的税额
        const isMarginVAT = item.vatRate.toUpperCase().includes('MARGIN');
        if (isMarginVAT) {
          const profit = (product.wholesalePrice || 0) - (product.costPrice || 0);
          const shouldBeTax = profit * 23 / 123;
          console.log(`  利润: €${profit.toFixed(2)}`);
          console.log(`  ⚠️  应该的税额: €${shouldBeTax.toFixed(2)}`);
        }
      } else {
        console.log(`  ⚠️  未找到产品记录`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoice();
