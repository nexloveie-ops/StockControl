require('dotenv').config();
const mongoose = require('mongoose');

async function testFinancialReportAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 模拟API的查询逻辑
    const startDate = '2026-01-01';
    const endDate = '2026-02-28';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    console.log(`📅 查询日期范围:`);
    console.log(`  ${start.toISOString()} 到 ${end.toISOString()}\n`);
    
    // 查询AdminInventory
    const adminInventory = await AdminInventory.find({
      createdAt: { $gte: start, $lte: end },
      invoiceNumber: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📦 查询到 ${adminInventory.length} 条AdminInventory记录\n`);
    
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
    
    console.log(`📋 发票分组结果:`);
    Object.keys(invoiceGroups).forEach(invoiceNum => {
      const group = invoiceGroups[invoiceNum];
      console.log(`\n发票号: ${invoiceNum}`);
      console.log(`  供货商: ${group.supplier}`);
      console.log(`  产品数: ${group.items.length}`);
      console.log(`  日期: ${group.date.toISOString()}`);
      
      let totalAmount = 0;
      let taxAmount = 0;
      
      group.items.forEach(item => {
        const itemTotal = (item.costPrice || 0) * item.quantity;
        totalAmount += itemTotal;
        
        // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          taxAmount += itemTotal - (itemTotal / 1.23);
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          taxAmount += itemTotal - (itemTotal / 1.135);
        }
      });
      
      console.log(`  总金额: €${totalAmount.toFixed(2)}`);
      console.log(`  税额: €${taxAmount.toFixed(2)}`);
      console.log(`  不含税: €${(totalAmount - taxAmount).toFixed(2)}`);
      
      // 显示前3个产品
      console.log(`  前3个产品:`);
      group.items.slice(0, 3).forEach((item, idx) => {
        console.log(`    ${idx + 1}. ${item.productName} x${item.quantity} @ €${item.costPrice} = €${(item.costPrice * item.quantity).toFixed(2)}`);
      });
      if (group.items.length > 3) {
        console.log(`    ... 还有 ${group.items.length - 3} 个产品`);
      }
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ 数据库连接已关闭');
  }
}

testFinancialReportAPI();
