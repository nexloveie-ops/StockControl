// 检查发票 INV-001 的详细信息
const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoiceINV001() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    
    const invoiceNumber = 'INV-001';
    
    console.log(`=== 检查发票: ${invoiceNumber} ===\n`);
    
    // 1. 查找 PurchaseInvoice
    console.log('📋 在 PurchaseInvoice 中查找...');
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber })
      .populate('supplier', 'name')
      .lean();
    
    if (invoice) {
      console.log('✅ 找到 PurchaseInvoice:');
      console.log(`   发票ID: ${invoice._id}`);
      console.log(`   供应商: ${invoice.supplier?.name || 'N/A'}`);
      console.log(`   日期: ${invoice.invoiceDate}`);
      console.log(`   总金额: €${invoice.totalAmount}`);
      console.log(`   产品项数量: ${invoice.items?.length || 0}\n`);
      
      if (invoice.items && invoice.items.length > 0) {
        console.log('   产品明细:');
        invoice.items.forEach((item, idx) => {
          console.log(`   ${idx + 1}. ${item.description || item.productName || 'N/A'}`);
          console.log(`      数量: ${item.quantity}`);
          console.log(`      单价: €${item.unitCost}`);
          console.log(`      总价: €${item.totalCost}`);
          console.log(`      税率: ${item.vatRate || 'N/A'}`);
          console.log(`      序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
        });
      }
      console.log('');
    } else {
      console.log('❌ 在 PurchaseInvoice 中未找到\n');
    }
    
    // 2. 查找 AdminInventory 中的产品
    console.log('📦 在 AdminInventory 中查找...');
    const adminItems = await AdminInventory.find({ invoiceNumber }).lean();
    
    if (adminItems.length > 0) {
      console.log(`✅ 找到 ${adminItems.length} 个 AdminInventory 记录:\n`);
      
      // 按产品名称分组
      const grouped = {};
      adminItems.forEach(item => {
        const key = `${item.productName}-${item.model}-${item.color}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
      
      Object.keys(grouped).forEach((key, idx) => {
        const items = grouped[key];
        const first = items[0];
        console.log(`${idx + 1}. ${first.productName} - ${first.model} - ${first.color}`);
        console.log(`   数量: ${items.length}`);
        console.log(`   单价: €${first.costPrice}`);
        console.log(`   税务分类: ${first.taxClassification}`);
        console.log(`   成色: ${first.condition || 'N/A'}`);
        console.log(`   序列号:`);
        items.forEach(item => {
          console.log(`     - ${item.serialNumber} (IMEI: ${item.imei || 'N/A'})`);
        });
        console.log('');
      });
    } else {
      console.log('❌ 在 AdminInventory 中未找到\n');
    }
    
    console.log('=== 分析 ===');
    console.log('前端显示发票详情时，应该:');
    console.log('1. 如果有 PurchaseInvoice，显示其 items');
    console.log('2. 同时查询 AdminInventory，合并显示');
    console.log('3. 相同产品应该合并为一行，显示总数量和所有序列号');
    console.log('4. 必须显示成色（condition）字段');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoiceINV001();
