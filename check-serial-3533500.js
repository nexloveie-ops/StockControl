// 检查序列号 3533500 的产品和采购记录
const mongoose = require('mongoose');
require('dotenv').config();

async function checkSerial3533500() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    const serialNumber = '3533500';
    
    console.log(`=== 检查序列号: ${serialNumber} ===\n`);
    
    // 1. 在 ProductNew 中查找
    console.log('📦 在 ProductNew 中查找...');
    const productNew = await ProductNew.findOne({
      'serialNumbers.serialNumber': serialNumber
    }).lean();
    
    if (productNew) {
      console.log('✅ 在 ProductNew 中找到:');
      console.log(`   产品ID: ${productNew._id}`);
      console.log(`   产品名称: ${productNew.name}`);
      console.log(`   品牌: ${productNew.brand}`);
      console.log(`   型号: ${productNew.model}`);
      console.log(`   序列号数量: ${productNew.serialNumbers?.length || 0}`);
      
      const sn = productNew.serialNumbers.find(s => s.serialNumber === serialNumber);
      if (sn) {
        console.log(`   序列号状态: ${sn.status}`);
        console.log(`   IMEI: ${sn.imei || 'N/A'}`);
      }
      console.log('');
      
      // 查找该产品的采购发票
      console.log('📋 查找 PurchaseInvoice 中的采购记录...');
      const invoices = await PurchaseInvoice.find({
        'items.product': productNew._id
      }).populate('supplier', 'name').lean();
      
      if (invoices.length > 0) {
        console.log(`✅ 找到 ${invoices.length} 个采购发票:`);
        invoices.forEach((inv, idx) => {
          console.log(`\n   ${idx + 1}. 发票号: ${inv.invoiceNumber}`);
          console.log(`      供应商: ${inv.supplier?.name || 'N/A'}`);
          console.log(`      日期: ${inv.invoiceDate}`);
          
          const items = inv.items.filter(item => 
            item.product && item.product.toString() === productNew._id.toString()
          );
          
          items.forEach(item => {
            console.log(`      - ${item.description || 'N/A'}`);
            console.log(`        数量: ${item.quantity}`);
            console.log(`        单价: €${item.unitCost}`);
            console.log(`        序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
          });
        });
      } else {
        console.log('❌ 在 PurchaseInvoice 中未找到采购记录');
      }
    } else {
      console.log('❌ 在 ProductNew 中未找到\n');
    }
    
    // 2. 在 AdminInventory 中查找
    console.log('\n📦 在 AdminInventory 中查找...');
    const adminInv = await AdminInventory.findOne({
      serialNumber: serialNumber
    }).lean();
    
    if (adminInv) {
      console.log('✅ 在 AdminInventory 中找到:');
      console.log(`   产品ID: ${adminInv._id}`);
      console.log(`   产品名称: ${adminInv.productName}`);
      console.log(`   品牌: ${adminInv.brand}`);
      console.log(`   型号: ${adminInv.model}`);
      console.log(`   发票号: ${adminInv.invoiceNumber}`);
      console.log(`   序列号: ${adminInv.serialNumber}`);
      console.log(`   IMEI: ${adminInv.imei || 'N/A'}`);
      console.log(`   状态: ${adminInv.status}`);
      console.log(`   创建时间: ${adminInv.createdAt}`);
      console.log('');
      
      // 查找对应的 PurchaseInvoice
      if (adminInv.invoiceNumber) {
        console.log(`📋 查找发票号 ${adminInv.invoiceNumber} 的采购记录...`);
        const invoice = await PurchaseInvoice.findOne({
          invoiceNumber: adminInv.invoiceNumber
        }).populate('supplier', 'name').lean();
        
        if (invoice) {
          console.log('✅ 找到对应的采购发票:');
          console.log(`   发票ID: ${invoice._id}`);
          console.log(`   供应商: ${invoice.supplier?.name || 'N/A'}`);
          console.log(`   日期: ${invoice.invoiceDate}`);
          console.log(`   总金额: €${invoice.totalAmount}`);
        } else {
          console.log('❌ 未找到对应的 PurchaseInvoice 记录');
          console.log('   这意味着产品是通过 AdminInventory 直接入库的，没有创建 PurchaseInvoice');
        }
      }
    } else {
      console.log('❌ 在 AdminInventory 中未找到');
    }
    
    console.log('\n=== 分析 ===');
    if (!productNew && !adminInv) {
      console.log('❌ 序列号 3533500 在系统中不存在');
    } else if (adminInv && !productNew) {
      console.log('⚠️  产品只存在于 AdminInventory，未同步到 ProductNew');
      console.log('   这可能是因为:');
      console.log('   1. 产品是通过发票上传直接入库到 AdminInventory');
      console.log('   2. 没有创建对应的 PurchaseInvoice 记录');
      console.log('   3. 前端查询采购记录时只查询了 PurchaseInvoice，没有查询 AdminInventory');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSerial3533500();
