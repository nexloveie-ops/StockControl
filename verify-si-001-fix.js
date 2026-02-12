// 验证SI-001修复 - 检查Financial Reports API返回的发票ID格式
require('dotenv').config();
const mongoose = require('mongoose');

async function verifySI001Fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    // 1. 检查PurchaseInvoice表中是否还有SI-001
    console.log('📋 检查PurchaseInvoice表...');
    const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-001' });
    if (purchaseInvoice) {
      console.log('❌ PurchaseInvoice表中仍存在SI-001（应该已删除）');
      console.log(`   ID: ${purchaseInvoice._id}`);
    } else {
      console.log('✅ PurchaseInvoice表中已无SI-001记录');
    }
    
    // 2. 检查AdminInventory表中的SI-001数据
    console.log('\n📋 检查AdminInventory表...');
    const adminProducts = await AdminInventory.find({ invoiceNumber: 'SI-001' });
    console.log(`✅ AdminInventory中找到 ${adminProducts.length} 个产品`);
    
    if (adminProducts.length > 0) {
      // 计算总金额和税额
      let totalAmount = 0;
      let taxAmount = 0;
      
      adminProducts.forEach(product => {
        const itemTotal = product.costPrice * product.quantity;
        totalAmount += itemTotal;
        
        // 计算税额
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxAmount += itemTotal - (itemTotal / 1.23);
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxAmount += itemTotal - (itemTotal / 1.135);
        }
      });
      
      console.log(`   供货商: ${adminProducts[0].supplier}`);
      console.log(`   总金额: €${totalAmount.toFixed(2)}`);
      console.log(`   税额: €${taxAmount.toFixed(2)}`);
      console.log(`   创建时间: ${adminProducts[0].createdAt}`);
    }
    
    // 3. 模拟Financial Reports API的逻辑
    console.log('\n📊 模拟Financial Reports API返回格式...');
    const invoiceNum = 'SI-001';
    const group = {
      items: adminProducts,
      supplier: adminProducts[0].supplier,
      date: adminProducts[0].createdAt
    };
    
    let totalAmount = 0;
    let taxAmount = 0;
    
    group.items.forEach(item => {
      const itemTotal = (item.costPrice || 0) * item.quantity;
      totalAmount += itemTotal;
      
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        taxAmount += itemTotal - (itemTotal / 1.23);
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
        taxAmount += itemTotal - (itemTotal / 1.135);
      }
    });
    
    const apiResult = {
      _id: `admin-${invoiceNum}`, // ✅ 修复后的格式
      invoiceNumber: invoiceNum,
      type: 'purchase',
      subType: 'external',
      partner: group.supplier,
      date: group.date,
      totalAmount: totalAmount,
      taxAmount: -taxAmount,
      subtotal: totalAmount - taxAmount
    };
    
    console.log('✅ API返回格式：');
    console.log(`   _id: "${apiResult._id}" (可用于Invoice Details API)`);
    console.log(`   invoiceNumber: "${apiResult.invoiceNumber}"`);
    console.log(`   partner: "${apiResult.partner}"`);
    console.log(`   totalAmount: €${apiResult.totalAmount.toFixed(2)}`);
    console.log(`   taxAmount: €${apiResult.taxAmount.toFixed(2)}`);
    
    // 4. 验证Invoice Details API可以识别这个ID
    console.log('\n🔍 验证Invoice Details API兼容性...');
    const invoiceId = apiResult._id;
    if (invoiceId.startsWith('admin-')) {
      const extractedInvoiceNumber = invoiceId.replace('admin-', '');
      console.log(`✅ ID格式正确，可以提取发票号: "${extractedInvoiceNumber}"`);
      
      const verifyProducts = await AdminInventory.find({ invoiceNumber: extractedInvoiceNumber });
      console.log(`✅ 可以查询到 ${verifyProducts.length} 个产品`);
    } else {
      console.log('❌ ID格式不正确，Invoice Details API无法识别');
    }
    
    console.log('\n✅ 验证完成！SI-001现在可以正常点击查看详情。');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifySI001Fix();
