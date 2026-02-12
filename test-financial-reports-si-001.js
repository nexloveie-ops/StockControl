// 测试Financial Reports API是否返回SI-001
require('dotenv').config();
const mongoose = require('mongoose');

async function testFinancialReportsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    
    // 模拟API查询：2026-01-01 到 2026-02-28
    const startDate = '2026-01-01';
    const endDate = '2026-02-28';
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    console.log(`📊 查询日期范围: ${startDate} 到 ${endDate}\n`);
    
    // 1. 查询PurchaseInvoice
    console.log('📋 查询PurchaseInvoice表...');
    const purchaseInvoices = await PurchaseInvoice.find({
      invoiceDate: { $gte: start, $lte: end },
      isActive: true
    }).populate('supplier', 'name');
    
    console.log(`   找到 ${purchaseInvoices.length} 条采购发票`);
    const results = [];
    
    purchaseInvoices.forEach(invoice => {
      results.push({
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        type: 'purchase',
        subType: 'external',
        partner: invoice.supplier?.name || 'Unknown',
        date: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        taxAmount: -invoice.taxAmount,
        subtotal: invoice.subtotal
      });
    });
    
    // 2. 查询AdminInventory
    console.log('\n📋 查询AdminInventory表...');
    const adminInventory = await AdminInventory.find({
      createdAt: { $gte: start, $lte: end },
      invoiceNumber: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`   找到 ${adminInventory.length} 个产品记录`);
    
    // 按发票号分组
    const invoiceGroups = {};
    adminInventory.forEach(item => {
      const invoiceNum = item.invoiceNumber;
      if (!invoiceGroups[invoiceNum]) {
        invoiceGroups[invoiceNum] = {
          items: [],
          supplier: item.supplier || '未知供货商',
          date: item.createdAt
        };
      }
      invoiceGroups[invoiceNum].items.push(item);
    });
    
    console.log(`   分组后有 ${Object.keys(invoiceGroups).length} 个发票号`);
    
    // 将分组的发票添加到结果列表
    Object.keys(invoiceGroups).forEach(invoiceNum => {
      const group = invoiceGroups[invoiceNum];
      
      // 检查是否已经在PurchaseInvoice中
      const exists = results.some(r => r.invoiceNumber === invoiceNum);
      if (exists) {
        console.log(`   ⚠️  ${invoiceNum} 已存在于PurchaseInvoice，跳过`);
        return;
      }
      
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
      
      console.log(`   ✅ 添加 ${invoiceNum}: ${group.items.length} 个产品, €${totalAmount.toFixed(2)}`);
      
      results.push({
        _id: `admin-${invoiceNum}`,
        invoiceNumber: invoiceNum,
        type: 'purchase',
        subType: 'external',
        partner: group.supplier,
        date: group.date,
        totalAmount: totalAmount,
        taxAmount: -taxAmount,
        subtotal: totalAmount - taxAmount
      });
    });
    
    // 3. 显示结果
    console.log(`\n📊 Financial Reports API将返回 ${results.length} 条发票记录\n`);
    
    // 查找SI-001
    const si001 = results.find(r => r.invoiceNumber === 'SI-001');
    if (si001) {
      console.log('✅ SI-001 在结果列表中:');
      console.log(`   _id: ${si001._id}`);
      console.log(`   invoiceNumber: ${si001.invoiceNumber}`);
      console.log(`   partner: ${si001.partner}`);
      console.log(`   totalAmount: €${si001.totalAmount.toFixed(2)}`);
      console.log(`   taxAmount: €${si001.taxAmount.toFixed(2)}`);
      console.log(`   date: ${si001.date}`);
    } else {
      console.log('❌ SI-001 不在结果列表中');
    }
    
    // 显示所有采购发票
    console.log('\n📋 所有采购发票列表:');
    const purchaseResults = results.filter(r => r.type === 'purchase');
    purchaseResults.forEach(invoice => {
      console.log(`   ${invoice.invoiceNumber} - ${invoice.partner} - €${invoice.totalAmount.toFixed(2)} - €${invoice.taxAmount.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

testFinancialReportsAPI();
