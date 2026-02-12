require('dotenv').config();
const mongoose = require('mongoose');

async function checkProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const ProductNew = require('./models/ProductNew');
    const MerchantInventory = require('./models/MerchantInventory');
    const AdminInventory = require('./models/AdminInventory');

    const serialNumber = '357479188926245';

    console.log('=== 查找旧系统产品（ProductNew）===');
    const oldProduct = await ProductNew.findOne({
      'serialNumbers.serialNumber': serialNumber
    });

    if (oldProduct) {
      console.log(`产品ID: ${oldProduct._id}`);
      console.log(`产品名称: ${oldProduct.name}`);
      console.log(`SKU: ${oldProduct.sku || '无'}`);
      console.log(`条码: ${oldProduct.barcode || '无'}`);
      console.log(`\n价格信息:`);
      console.log(`  - 成本价 (costPrice): €${oldProduct.costPrice || 0}`);
      console.log(`  - 批发价 (wholesalePrice): €${oldProduct.wholesalePrice || 0}`);
      console.log(`  - 零售价 (retailPrice): €${oldProduct.retailPrice || 0}`);
      console.log(`\n库存信息:`);
      console.log(`  - 库存数量: ${oldProduct.stockQuantity}`);
      console.log(`  - 分类: ${oldProduct.category || '无'}`);
      console.log(`  - 成色: ${oldProduct.condition || '无'}`);
      console.log(`  - 税分类: ${oldProduct.vatRate || '无'}`);
      
      const serialInfo = oldProduct.serialNumbers.find(sn => sn.serialNumber === serialNumber);
      if (serialInfo) {
        console.log(`\n序列号信息:`);
        console.log(`  - 序列号: ${serialInfo.serialNumber}`);
        console.log(`  - 状态: ${serialInfo.status}`);
        console.log(`  - 采购发票: ${serialInfo.purchaseInvoice || '无'}`);
        console.log(`  - 销售发票: ${serialInfo.salesInvoice || '无'}`);
        console.log(`  - 采购日期: ${serialInfo.purchaseDate || '无'}`);
        console.log(`  - 销售日期: ${serialInfo.soldDate || '无'}`);
      }
    } else {
      console.log('❌ 未找到旧系统产品记录');
    }

    console.log('\n=== 查找商户库存（MerchantInventory）===');
    const merchantInventory = await MerchantInventory.findOne({
      serialNumber: serialNumber
    });

    if (merchantInventory) {
      console.log(`库存ID: ${merchantInventory._id}`);
      console.log(`产品名称: ${merchantInventory.productName}`);
      console.log(`商户ID: ${merchantInventory.merchantId}`);
      console.log(`\n价格信息:`);
      console.log(`  - 成本价 (costPrice): €${merchantInventory.costPrice || 0}`);
      console.log(`  - 批发价 (wholesalePrice): €${merchantInventory.wholesalePrice || 0}`);
      console.log(`  - 零售价 (retailPrice): €${merchantInventory.retailPrice || 0}`);
      console.log(`\n库存信息:`);
      console.log(`  - 库存数量: ${merchantInventory.quantity}`);
      console.log(`  - 分类: ${merchantInventory.category || '无'}`);
      console.log(`  - 成色: ${merchantInventory.condition || '无'}`);
      console.log(`  - 税分类: ${merchantInventory.taxClassification || '无'}`);
      console.log(`  - 序列号: ${merchantInventory.serialNumber || '无'}`);
      console.log(`  - 入库日期: ${merchantInventory.receivedDate || '无'}`);
    } else {
      console.log('❌ 未找到商户库存记录');
    }

    console.log('\n=== 查找管理员库存（AdminInventory）===');
    const adminInventory = await AdminInventory.findOne({
      serialNumber: serialNumber
    });

    if (adminInventory) {
      console.log(`库存ID: ${adminInventory._id}`);
      console.log(`产品名称: ${adminInventory.productName}`);
      console.log(`\n价格信息:`);
      console.log(`  - 成本价 (costPrice): €${adminInventory.costPrice || 0}`);
      console.log(`  - 批发价 (wholesalePrice): €${adminInventory.wholesalePrice || 0}`);
      console.log(`  - 零售价 (retailPrice): €${adminInventory.retailPrice || 0}`);
      console.log(`\n库存信息:`);
      console.log(`  - 库存数量: ${adminInventory.quantity}`);
      console.log(`  - 分类: ${adminInventory.category || '无'}`);
      console.log(`  - 成色: ${adminInventory.condition || '无'}`);
      console.log(`  - 税分类: ${adminInventory.taxClassification || '无'}`);
      console.log(`  - 序列号: ${adminInventory.serialNumber || '无'}`);
    } else {
      console.log('❌ 未找到管理员库存记录');
    }

    console.log('\n=== 总结 ===');
    if (oldProduct) {
      console.log(`✅ 产品批发价: €${oldProduct.wholesalePrice || 0}`);
    } else if (merchantInventory) {
      console.log(`✅ 产品批发价: €${merchantInventory.wholesalePrice || 0}`);
    } else if (adminInventory) {
      console.log(`✅ 产品批发价: €${adminInventory.wholesalePrice || 0}`);
    } else {
      console.log('❌ 未找到任何产品记录');
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkProduct();
