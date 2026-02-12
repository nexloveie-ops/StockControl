const mongoose = require('mongoose');
require('dotenv').config();

const MerchantInventory = require('./models/MerchantInventory');
const MerchantSale = require('./models/MerchantSale');
const SalesInvoice = require('./models/SalesInvoice');

async function checkInvoiceProductPrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    const serialNumber = '357479188926245';
    const invoiceNumber = 'SI-1770856113244-0001';

    // 1. 查找产品
    console.log('\n=== 查找产品 ===');
    const product = await MerchantInventory.findOne({ serialNumber }).lean();
    if (product) {
      console.log('产品名称:', product.productName);
      console.log('序列号:', product.serialNumber);
      console.log('成本价 (costPrice):', product.costPrice);
      console.log('批发价 (wholesalePrice):', product.wholesalePrice);
      console.log('零售价 (retailPrice):', product.retailPrice);
      console.log('税务分类:', product.taxClassification);
    } else {
      console.log('❌ 未找到产品');
    }

    // 2. 查找销售发票（旧系统）
    console.log('\n=== 查找销售发票（SalesInvoice）===');
    const salesInvoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    if (salesInvoice) {
      console.log('发票编号:', salesInvoice.invoiceNumber);
      console.log('发票日期:', salesInvoice.invoiceDate);
      console.log('总金额:', salesInvoice.totalAmount);
      
      console.log('\n产品列表:');
      salesInvoice.items.forEach((item, index) => {
        const hasSerial = item.serialNumbers && item.serialNumbers.includes(serialNumber);
        if (hasSerial) {
          console.log(`\n产品 ${index + 1} (包含目标序列号):`);
          console.log('  - 产品名称:', item.description);
          console.log('  - 数量:', item.quantity);
          console.log('  - 单价 (unitPrice):', item.unitPrice);
          console.log('  - 总价 (totalPrice):', item.totalPrice);
          console.log('  - VAT税率:', item.vatRate);
          console.log('  - 税额:', item.taxAmount);
          console.log('  - 序列号:', item.serialNumbers);
        }
      });
    } else {
      console.log('❌ 未找到销售发票');
    }

    // 3. 查找商户销售记录
    console.log('\n=== 查找商户销售记录（MerchantSale）===');
    const merchantSales = await MerchantSale.find({
      'items.serialNumber': serialNumber
    }).lean();
    
    if (merchantSales.length > 0) {
      merchantSales.forEach(sale => {
        console.log('\n销售记录ID:', sale._id);
        console.log('销售日期:', sale.saleDate);
        console.log('商户ID:', sale.merchantId);
        console.log('总金额:', sale.totalAmount);
        
        sale.items.forEach((item, index) => {
          if (item.serialNumber === serialNumber) {
            console.log(`\n产品 ${index + 1} (目标序列号):`);
            console.log('  - 产品名称:', item.productName);
            console.log('  - 数量:', item.quantity);
            console.log('  - 销售价格 (price):', item.price);
            console.log('  - 成本价 (costPrice):', item.costPrice);
            console.log('  - 税务分类:', item.taxClassification);
            console.log('  - 税额:', item.taxAmount);
            console.log('  - 序列号:', item.serialNumber);
          }
        });
      });
    } else {
      console.log('❌ 未找到商户销售记录');
    }

    // 4. 对比分析
    console.log('\n=== 价格对比分析 ===');
    if (product && salesInvoice) {
      const invoiceItem = salesInvoice.items.find(item => 
        item.serialNumbers && item.serialNumbers.includes(serialNumber)
      );
      
      if (invoiceItem) {
        console.log('\n产品批发价:', product.wholesalePrice);
        console.log('发票中的单价:', invoiceItem.unitPrice);
        console.log('价格是否一致:', product.wholesalePrice === invoiceItem.unitPrice ? '✅ 一致' : '❌ 不一致');
        
        if (product.wholesalePrice !== invoiceItem.unitPrice) {
          console.log('\n⚠️  价格不一致的原因:');
          console.log('  - 发票中存储的是不含税价格');
          console.log('  - 产品的批发价可能是含税价格');
          console.log('  - 或者发票创建时使用了不同的价格');
        }
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvoiceProductPrice();
