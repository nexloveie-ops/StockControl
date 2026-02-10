require('dotenv').config();
const mongoose = require('mongoose');

async function verifySI003Tax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const PurchaseInvoice = require('./models/PurchaseInvoice');

    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-003' }).lean();

    if (!invoice) {
      console.log('❌ 未找到SI-003发票');
      await mongoose.connection.close();
      return;
    }

    console.log('=== SI-003 PurchaseInvoice Item ===');
    console.log(`items数量: ${invoice.items.length}`);
    
    invoice.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  单价: €${item.unitCost}`);
      console.log(`  总价: €${item.totalCost}`);
      console.log(`  税率: ${item.vatRate}`);
      console.log(`  税额: €${item.taxAmount || 0}`);
      
      // 计算正确的税额
      if (item.vatRate === 'VAT 0%') {
        console.log(`  ✅ VAT 0% - 不含税价格 = 含税价格 = €${item.totalCost}`);
      } else if (item.vatRate === 'VAT 23%') {
        const excludingTax = item.totalCost / 1.23;
        const tax = item.totalCost - excludingTax;
        console.log(`  ✅ VAT 23% - 不含税: €${excludingTax.toFixed(2)}, 税额: €${tax.toFixed(2)}`);
      } else if (item.vatRate === 'VAT 13.5%') {
        const excludingTax = item.totalCost / 1.135;
        const tax = item.totalCost - excludingTax;
        console.log(`  ✅ VAT 13.5% - 不含税: €${excludingTax.toFixed(2)}, 税额: €${tax.toFixed(2)}`);
      }
    });

    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

verifySI003Tax();
