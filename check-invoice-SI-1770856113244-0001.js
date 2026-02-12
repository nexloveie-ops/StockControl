require('dotenv').config();
const mongoose = require('mongoose');

async function checkInvoiceDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const SalesInvoice = require('./models/SalesInvoice');
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    const Customer = require('./models/Customer');
    const ProductNew = require('./models/ProductNew');

    const invoiceNumber = 'SI-1770856113244-0001';
    const serialNumber = '357479188926245';

    console.log('=== 查找销售发票（SalesInvoice）===');
    const salesInvoice = await SalesInvoice.findOne({ invoiceNumber })
      .populate('customer', 'name code')
      .populate('items.product', 'name wholesalePrice retailPrice');

    if (salesInvoice) {
      console.log(`发票编号: ${salesInvoice.invoiceNumber}`);
      console.log(`发票日期: ${salesInvoice.invoiceDate}`);
      console.log(`客户: ${salesInvoice.customer?.name || '未知'}`);
      console.log(`总金额: ${salesInvoice.totalAmount}\n`);

      const targetItem = salesInvoice.items.find(item => 
        item.serialNumbers && item.serialNumbers.includes(serialNumber)
      );

      if (targetItem) {
        console.log('目标产品信息:');
        console.log(`  - 产品名称: ${targetItem.product?.name || targetItem.description}`);
        console.log(`  - 产品批发价: ${targetItem.product?.wholesalePrice || '未知'}`);
        console.log(`  - 产品零售价: ${targetItem.product?.retailPrice || '未知'}`);
        console.log(`  - 发票单价 (unitPrice): ${targetItem.unitPrice}`);
        console.log(`  - 发票总价 (totalPrice): ${targetItem.totalPrice}`);
        console.log(`  - 税率: ${targetItem.vatRate}`);
        console.log(`  - 税额: ${targetItem.taxAmount}`);
        console.log(`  - 序列号: ${targetItem.serialNumbers}\n`);
      }
    } else {
      console.log('❌ 未找到销售发票\n');
    }

    console.log('=== 查找商户销售记录（MerchantSale）===');
    const merchantSales = await MerchantSale.find({
      'items.serialNumber': serialNumber
    }).sort({ saleDate: -1 });

    if (merchantSales.length > 0) {
      for (const sale of merchantSales) {
        console.log(`销售ID: ${sale._id}`);
        console.log(`销售日期: ${sale.saleDate}`);
        console.log(`总金额: ${sale.totalAmount}`);
        console.log(`支付方式: ${sale.paymentMethod}\n`);

        const targetItem = sale.items.find(item => item.serialNumber === serialNumber);
        if (targetItem) {
          console.log('目标产品信息:');
          console.log(`  - 产品名称: ${targetItem.productName}`);
          console.log(`  - 销售价格: ${targetItem.price}`);
          console.log(`  - 成本价格: ${targetItem.costPrice}`);
          console.log(`  - 数量: ${targetItem.quantity}`);
          console.log(`  - 税分类: ${targetItem.taxClassification}`);
          console.log(`  - 税额: ${targetItem.taxAmount}`);
          console.log(`  - 序列号: ${targetItem.serialNumber}\n`);
        }
      }
    } else {
      console.log('❌ 未找到商户销售记录\n');
    }

    console.log('=== 查找库存记录（MerchantInventory）===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: serialNumber
    });

    if (inventory) {
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`成本价: ${inventory.costPrice}`);
      console.log(`批发价: ${inventory.wholesalePrice}`);
      console.log(`零售价: ${inventory.retailPrice}`);
      console.log(`库存数量: ${inventory.quantity}`);
      console.log(`序列号: ${inventory.serialNumber}\n`);
    } else {
      console.log('❌ 未找到库存记录（可能已售出）\n');
    }

    console.log('=== 价格分析 ===');
    if (salesInvoice && merchantSales.length > 0) {
      const invoiceItem = salesInvoice.items.find(item => 
        item.serialNumbers && item.serialNumbers.includes(serialNumber)
      );
      const saleItem = merchantSales[0].items.find(item => item.serialNumber === serialNumber);

      if (invoiceItem && saleItem) {
        console.log('⚠️ 价格不一致问题:');
        console.log(`  - SalesInvoice使用的价格: €${invoiceItem.unitPrice.toFixed(2)} (不含税)`);
        console.log(`  - MerchantSale实际销售价格: €${saleItem.price.toFixed(2)} (含税)`);
        console.log(`  - 产品批发价: €${invoiceItem.product?.wholesalePrice?.toFixed(2) || '未知'}`);
        console.log(`\n说明:`);
        console.log(`  - SalesInvoice创建时使用了产品的批发价（wholesalePrice）`);
        console.log(`  - MerchantSale记录了实际的销售价格（可能不同于批发价）`);
        console.log(`  - 客户发票查看功能返回的是SalesInvoice数据，不是实际销售价格\n`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvoiceDetails();
