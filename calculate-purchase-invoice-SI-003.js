// 计算采购发票 SI-003 的税额
require('dotenv').config();
const mongoose = require('mongoose');

async function calculatePurchaseInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    const invoiceNumber = 'SI-003';
    
    // 先检查PurchaseInvoice表
    console.log('📋 检查PurchaseInvoice表...');
    const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber })
      .populate('supplier', 'name')
      .lean();
    
    if (purchaseInvoice) {
      console.log(`✅ 在PurchaseInvoice表中找到 ${invoiceNumber}`);
      console.log(`   供货商: ${purchaseInvoice.supplier?.name || 'N/A'}`);
      console.log(`   产品数量: ${purchaseInvoice.items?.length || 0}`);
      console.log(`   总金额: €${purchaseInvoice.totalAmount || 0}`);
      console.log(`   税额: €${purchaseInvoice.taxAmount || 0}\n`);
    } else {
      console.log(`   PurchaseInvoice表中未找到\n`);
    }
    
    // 检查AdminInventory表
    console.log('📋 检查AdminInventory表...');
    const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
    
    if (adminProducts.length === 0) {
      console.log(`❌ AdminInventory表中也未找到 ${invoiceNumber}`);
      return;
    }
    
    console.log(`✅ 在AdminInventory表中找到 ${adminProducts.length} 个产品\n`);
    
    console.log(`📄 采购发票: ${invoiceNumber}`);
    console.log(`供货商: ${adminProducts[0].supplier}`);
    console.log(`位置: ${adminProducts[0].location}\n`);
    
    console.log('产品详情:');
    console.log('─'.repeat(130));
    console.log('产品名称'.padEnd(25) + '型号'.padEnd(20) + '颜色'.padEnd(15) + '数量'.padEnd(8) + '税率'.padEnd(15) + '单价(税前)'.padEnd(15) + '小计(税前)'.padEnd(15) + '税额');
    console.log('─'.repeat(130));
    
    let totalSubtotal = 0;  // 税前总额
    let totalTaxAmount = 0;  // 总税额
    
    adminProducts.forEach(product => {
      const productName = product.productName || 'N/A';
      const model = product.model || '';
      const color = product.color || '';
      const quantity = product.quantity || 0;
      const taxClassification = product.taxClassification || '';
      const costPrice = product.costPrice || 0;  // 税前单价
      
      // 计算小计和税额
      const subtotal = costPrice * quantity;  // 税前小计
      let taxAmount = 0;
      
      if (taxClassification === 'VAT_23' || taxClassification === 'VAT 23%') {
        taxAmount = subtotal * 0.23;  // 23%税率
      } else if (taxClassification === 'VAT_13_5' || taxClassification === 'VAT 13.5%') {
        taxAmount = subtotal * 0.135;  // 13.5%税率
      } else if (taxClassification === 'MARGIN_VAT' || taxClassification === 'MARGIN_VAT_0' || taxClassification === 'VAT_0' || taxClassification === 'VAT 0%') {
        taxAmount = 0;  // Margin VAT采购时不计税
      }
      
      console.log(
        productName.substring(0, 23).padEnd(25) +
        model.substring(0, 18).padEnd(20) +
        color.substring(0, 13).padEnd(15) +
        quantity.toString().padEnd(8) +
        taxClassification.padEnd(15) +
        `€${costPrice.toFixed(2)}`.padEnd(15) +
        `€${subtotal.toFixed(2)}`.padEnd(15) +
        `€${taxAmount.toFixed(2)}`
      );
      
      totalSubtotal += subtotal;
      totalTaxAmount += taxAmount;
    });
    
    const totalAmount = totalSubtotal + totalTaxAmount;  // 含税总额
    
    console.log('─'.repeat(130));
    console.log(
      '总计'.padEnd(68) +
      `€${totalSubtotal.toFixed(2)}`.padEnd(15) +
      `€${totalTaxAmount.toFixed(2)}`
    );
    console.log('─'.repeat(130));
    
    console.log('\n📊 税额计算总结:');
    console.log(`  税前总额(Subtotal): €${totalSubtotal.toFixed(2)}`);
    console.log(`  总税额(Tax Amount): €${totalTaxAmount.toFixed(2)}`);
    console.log(`  含税总额(Total Amount): €${totalAmount.toFixed(2)}`);
    
    console.log('\n💡 采购发票税额说明:');
    console.log('  - VAT 23%: 税额 = 税前金额 × 0.23');
    console.log('  - VAT 13.5%: 税额 = 税前金额 × 0.135');
    console.log('  - Margin VAT: 采购时税额 = 0 (只在销售时对差价征税)');
    console.log('  - VAT 0%: 税额 = 0');
    
    console.log('\n📋 AdminInventory中costPrice字段说明:');
    console.log('  costPrice = 税前价格(不含税)');
    console.log('  含税价格 = costPrice × (1 + 税率)');
    
  } catch (error) {
    console.error('❌ 计算失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

calculatePurchaseInvoice();
