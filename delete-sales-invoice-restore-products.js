const mongoose = require('mongoose');
require('dotenv').config();

async function deleteSalesInvoiceAndRestoreProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const SalesInvoice = require('./models/SalesInvoice');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const invoiceNumber = 'SI-1771434188653-0001';
    
    // 1. 查找销售发票
    const invoice = await SalesInvoice.findOne({ invoiceNumber }).lean();
    
    if (!invoice) {
      console.log('❌ 未找到发票:', invoiceNumber);
      return;
    }
    
    console.log(`\n📋 找到发票: ${invoiceNumber}`);
    console.log(`   产品数量: ${invoice.items.length}`);
    console.log(`   总金额: €${invoice.totalAmount}`);
    
    // 2. 恢复每个产品
    console.log('\n开始恢复产品...\n');
    
    for (const item of invoice.items) {
      console.log(`处理产品: ${item.productName}`);
      
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        // 有序列号的产品 - 恢复ProductNew中的序列号状态
        for (const serialNumber of item.serialNumbers) {
          console.log(`  恢复序列号: ${serialNumber}`);
          
          const product = await ProductNew.findOne({
            'serialNumbers.serialNumber': serialNumber
          });
          
          if (product) {
            // 找到序列号并恢复状态
            const serial = product.serialNumbers.find(sn => sn.serialNumber === serialNumber);
            if (serial) {
              serial.status = 'available';
              serial.soldDate = null;
              serial.soldPrice = null;
              
              // 更新库存数量
              product.stockQuantity = product.serialNumbers.filter(sn => sn.status === 'available').length;
              product.isActive = product.stockQuantity > 0;
              
              await product.save();
              console.log(`  ✅ 已恢复ProductNew: ${product.name}, 库存: ${product.stockQuantity}`);
            }
          }
          
          // 恢复AdminInventory
          const adminProduct = await AdminInventory.findOne({ serialNumber });
          if (adminProduct) {
            adminProduct.status = 'AVAILABLE';
            adminProduct.salesStatus = 'UNSOLD';
            await adminProduct.save();
            console.log(`  ✅ 已恢复AdminInventory: ${adminProduct.productName}`);
          }
        }
      } else {
        // 无序列号的产品（配件） - 恢复数量
        console.log(`  恢复配件数量: ${item.quantity}`);
        
        // 恢复AdminInventory
        const adminProducts = await AdminInventory.find({
          productName: item.productName,
          status: 'SOLD',
          salesStatus: 'SOLD'
        }).limit(item.quantity);
        
        for (const adminProduct of adminProducts) {
          adminProduct.status = 'AVAILABLE';
          adminProduct.salesStatus = 'UNSOLD';
          await adminProduct.save();
          console.log(`  ✅ 已恢复AdminInventory: ${adminProduct.productName}`);
        }
      }
      
      console.log('');
    }
    
    // 3. 删除销售发票
    await SalesInvoice.deleteOne({ invoiceNumber });
    console.log(`✅ 已删除销售发票: ${invoiceNumber}\n`);
    
    console.log('✅ 所有操作完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

deleteSalesInvoiceAndRestoreProducts();
