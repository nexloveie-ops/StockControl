const mongoose = require('mongoose');
require('dotenv').config();

async function checkSerial() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const serialNumber = '35532005';
    
    console.log(`🔍 查询序列号: ${serialNumber}\n`);
    
    // 1. 查询 AdminInventory
    console.log('=== AdminInventory ===\n');
    const AdminInventory = require('./models/AdminInventory');
    const adminProduct = await AdminInventory.findOne({ 
      serialNumber: serialNumber 
    }).lean();
    
    if (adminProduct) {
      console.log('✅ 在 AdminInventory 中找到:');
      console.log(`   _id: ${adminProduct._id}`);
      console.log(`   产品名称: ${adminProduct.productName}`);
      console.log(`   品牌: ${adminProduct.brand}`);
      console.log(`   型号: ${adminProduct.model}`);
      console.log(`   颜色: ${adminProduct.color}`);
      console.log(`   成色: ${adminProduct.condition}`);
      console.log(`   成本价: €${adminProduct.costPrice}`);
      console.log(`   批发价: €${adminProduct.wholesalePrice}`);
      console.log(`   零售价: €${adminProduct.retailPrice}`);
      console.log(`   数量: ${adminProduct.quantity}`);
      console.log(`   状态: ${adminProduct.status}`);
      console.log(`   供货商: ${adminProduct.supplier || '无'}`);
      console.log(`   发票号: ${adminProduct.invoiceNumber || '无'}`);
      console.log(`   创建时间: ${adminProduct.createdAt}`);
      console.log(`   更新时间: ${adminProduct.updatedAt}`);
      console.log('');
    } else {
      console.log('❌ AdminInventory 中未找到\n');
    }
    
    // 2. 查询 ProductNew
    console.log('=== ProductNew ===\n');
    const ProductNew = require('./models/ProductNew');
    const productNew = await ProductNew.findOne({
      'serialNumbers.serialNumber': serialNumber
    }).lean();
    
    if (productNew) {
      const serial = productNew.serialNumbers.find(sn => sn.serialNumber === serialNumber);
      console.log('✅ 在 ProductNew 中找到:');
      console.log(`   产品名称: ${productNew.name}`);
      console.log(`   品牌: ${productNew.brand}`);
      console.log(`   型号: ${productNew.model}`);
      console.log(`   颜色: ${productNew.color}`);
      console.log(`   成色: ${productNew.condition}`);
      console.log(`   序列号状态: ${serial.status}`);
      console.log(`   序列号成本价: €${serial.costPrice || '无'}`);
      if (serial.soldDate) {
        console.log(`   销售时间: ${serial.soldDate}`);
      }
      if (serial.soldTo) {
        console.log(`   销售给: ${serial.soldTo}`);
      }
      console.log('');
    } else {
      console.log('❌ ProductNew 中未找到\n');
    }
    
    // 3. 查询 MerchantInventory
    console.log('=== MerchantInventory ===\n');
    const MerchantInventory = require('./models/MerchantInventory');
    const merchantProducts = await MerchantInventory.find({
      serialNumber: serialNumber
    }).lean();
    
    if (merchantProducts.length > 0) {
      console.log(`✅ 在 MerchantInventory 中找到 ${merchantProducts.length} 条记录:\n`);
      merchantProducts.forEach((product, index) => {
        console.log(`${index + 1}. 商户: ${product.merchantId}`);
        console.log(`   产品名称: ${product.productName}`);
        console.log(`   数量: ${product.quantity}`);
        console.log(`   成本价: €${product.costPrice}`);
        console.log(`   批发价: €${product.wholesalePrice || '无'}`);
        console.log(`   零售价: €${product.retailPrice || '无'}`);
        console.log(`   状态: ${product.status}`);
        console.log(`   备注: ${product.notes || '无'}`);
        console.log('');
      });
    } else {
      console.log('❌ MerchantInventory 中未找到\n');
    }
    
    // 4. 查询调货记录
    console.log('=== InventoryTransfer ===\n');
    const InventoryTransfer = require('./models/InventoryTransfer');
    const transfers = await InventoryTransfer.find({
      'items.serialNumber': serialNumber
    }).lean();
    
    if (transfers.length > 0) {
      console.log(`✅ 发现 ${transfers.length} 次调货记录:\n`);
      transfers.forEach((transfer, index) => {
        console.log(`${index + 1}. 调货单号: ${transfer.transferNumber}`);
        console.log(`   从: ${transfer.fromMerchant}`);
        console.log(`   到: ${transfer.toMerchant}`);
        console.log(`   状态: ${transfer.status}`);
        console.log(`   创建时间: ${transfer.createdAt}`);
        if (transfer.transferDate) {
          console.log(`   调货时间: ${transfer.transferDate}`);
        }
        
        // 找到这个序列号的详细信息
        const item = transfer.items.find(i => i.serialNumber === serialNumber);
        if (item) {
          console.log(`   产品: ${item.productName}`);
          console.log(`   调货价格: €${item.transferPrice || '无'}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ 未找到调货记录\n');
    }
    
    // 5. 查询销售记录
    console.log('=== SalesInvoice ===\n');
    const SalesInvoice = require('./models/SalesInvoice');
    const salesInvoices = await SalesInvoice.find({
      'items.serialNumber': serialNumber
    }).lean();
    
    if (salesInvoices.length > 0) {
      console.log(`✅ 发现 ${salesInvoices.length} 条销售记录:\n`);
      salesInvoices.forEach((invoice, index) => {
        console.log(`${index + 1}. 发票号: ${invoice.invoiceNumber}`);
        console.log(`   客户: ${invoice.customer?.name || '未知'}`);
        console.log(`   销售日期: ${invoice.invoiceDate}`);
        console.log(`   总金额: €${invoice.totalAmount}`);
        
        // 找到这个序列号的产品
        const item = invoice.items.find(i => i.serialNumber === serialNumber);
        if (item) {
          console.log(`   产品: ${item.description || item.productName}`);
          console.log(`   销售价格: €${item.unitPrice || '无'}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ 未找到销售记录\n');
    }
    
    // 6. 查询 MerchantSale
    console.log('=== MerchantSale ===\n');
    const MerchantSale = require('./models/MerchantSale');
    const merchantSales = await MerchantSale.find({
      'items.serialNumber': serialNumber
    }).lean();
    
    if (merchantSales.length > 0) {
      console.log(`✅ 发现 ${merchantSales.length} 条商户销售记录:\n`);
      merchantSales.forEach((sale, index) => {
        console.log(`${index + 1}. 发票号: ${sale.invoiceNumber}`);
        console.log(`   商户: ${sale.merchantId}`);
        console.log(`   销售日期: ${sale.saleDate}`);
        console.log(`   总金额: €${sale.totalAmount}`);
        
        const item = sale.items.find(i => i.serialNumber === serialNumber);
        if (item) {
          console.log(`   产品: ${item.productName}`);
          console.log(`   销售价格: €${item.sellingPrice || '无'}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ 未找到商户销售记录\n');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkSerial();
