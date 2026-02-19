const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    const invoiceNumber = 'SI-3688';
    
    console.log(`📋 查询发票: ${invoiceNumber}\n`);
    
    // 1. 查询PurchaseInvoice
    console.log('=== PurchaseInvoice ===\n');
    const purchaseInvoice = await PurchaseInvoice.findOne({ 
      invoiceNumber: invoiceNumber 
    }).lean();
    
    if (purchaseInvoice) {
      console.log(`发票ID: ${purchaseInvoice._id}`);
      console.log(`供货商: ${purchaseInvoice.supplier}`);
      console.log(`发票日期: ${purchaseInvoice.invoiceDate}`);
      console.log(`状态: ${purchaseInvoice.status}`);
      console.log(`收货状态: ${purchaseInvoice.receivingStatus}`);
      console.log(`\nPurchaseInvoice中的产品 (${purchaseInvoice.items.length} 个):\n`);
      
      purchaseInvoice.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.description}`);
        console.log(`   产品ID: ${item.product}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   单价: €${item.unitCost}`);
        console.log(`   总价: €${item.totalCost}`);
        console.log(`   序列号: ${item.serialNumbers?.join(', ') || '无'}`);
        console.log('');
      });
    } else {
      console.log('  ❌ PurchaseInvoice中未找到\n');
    }
    
    // 2. 查询AdminInventory
    console.log('=== AdminInventory ===\n');
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: invoiceNumber 
    }).lean();
    
    console.log(`找到 ${adminProducts.length} 个产品\n`);
    
    if (adminProducts.length > 0) {
      adminProducts.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   _id: ${item._id}`);
        console.log(`   品牌: ${item.brand}`);
        console.log(`   型号: ${item.model}`);
        console.log(`   颜色: ${item.color}`);
        console.log(`   成色: ${item.condition}`);
        console.log(`   数量: ${item.quantity} ⚠️`);
        console.log(`   成本价: €${item.costPrice}`);
        console.log(`   批发价: €${item.wholesalePrice}`);
        console.log(`   零售价: €${item.retailPrice}`);
        console.log(`   状态: ${item.status}`);
        console.log(`   序列号: ${item.serialNumber || '无'}`);
        console.log(`   供货商: ${item.supplier || '无'}`);
        console.log(`   商户ID: ${item.merchantId || '无'}`);
        console.log(`   创建时间: ${item.createdAt}`);
        console.log(`   更新时间: ${item.updatedAt}`);
        console.log('');
      });
    }
    
    // 3. 查询MerchantInventory（看是否有相关记录）
    console.log('=== MerchantInventory ===\n');
    const merchantProducts = await MerchantInventory.find({
      notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
    }).lean();
    
    console.log(`找到 ${merchantProducts.length} 个产品\n`);
    
    if (merchantProducts.length > 0) {
      merchantProducts.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   状态: ${item.status}`);
        console.log(`   商户ID: ${item.merchantId}`);
        console.log(`   备注: ${item.notes}`);
        console.log('');
      });
    }
    
    // 4. 查询这些产品是否被销售或调货
    console.log('=== 产品流向追踪 ===\n');
    
    for (const product of adminProducts) {
      if (product.serialNumber) {
        console.log(`追踪序列号: ${product.serialNumber} (${product.productName})`);
        
        // 查询是否在ProductNew中
        const ProductNew = require('./models/ProductNew');
        const productNew = await ProductNew.findOne({
          'serialNumbers.serialNumber': product.serialNumber
        }).lean();
        
        if (productNew) {
          const serial = productNew.serialNumbers.find(sn => sn.serialNumber === product.serialNumber);
          console.log(`  ✓ 在ProductNew中找到`);
          console.log(`    产品名称: ${productNew.name}`);
          console.log(`    序列号状态: ${serial.status}`);
          if (serial.soldDate) {
            console.log(`    销售时间: ${serial.soldDate}`);
          }
        }
        
        // 查询是否被调货
        const InventoryTransfer = require('./models/InventoryTransfer');
        const transfers = await InventoryTransfer.find({
          'items.serialNumber': product.serialNumber
        }).lean();
        
        if (transfers.length > 0) {
          console.log(`  ✓ 发现 ${transfers.length} 次调货记录`);
          transfers.forEach(transfer => {
            console.log(`    调货单: ${transfer.transferNumber}`);
            console.log(`    从: ${transfer.fromMerchant} → 到: ${transfer.toMerchant}`);
            console.log(`    状态: ${transfer.status}`);
            console.log(`    时间: ${transfer.createdAt}`);
          });
        }
        
        // 查询是否在MerchantInventory中
        const merchantInv = await MerchantInventory.findOne({
          serialNumber: product.serialNumber
        }).lean();
        
        if (merchantInv) {
          console.log(`  ✓ 在MerchantInventory中找到`);
          console.log(`    商户: ${merchantInv.merchantId}`);
          console.log(`    数量: ${merchantInv.quantity}`);
          console.log(`    状态: ${merchantInv.status}`);
        }
        
        console.log('');
      }
    }
    
    // 5. 分析原因
    console.log('=== 原因分析 ===\n');
    
    const zeroQuantityProducts = adminProducts.filter(p => p.quantity === 0);
    console.log(`数量为0的产品: ${zeroQuantityProducts.length} / ${adminProducts.length}`);
    
    if (zeroQuantityProducts.length > 0) {
      console.log('\n可能的原因:');
      console.log('1. 产品已被销售（序列号状态为sold）');
      console.log('2. 产品已被调货到其他商户');
      console.log('3. 产品被手动修改了数量');
      console.log('4. 入库时就设置为0（数据错误）');
      console.log('\n需要检查:');
      console.log('- 序列号的销售记录');
      console.log('- 调货记录');
      console.log('- AdminInventory的更新历史');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoice();
