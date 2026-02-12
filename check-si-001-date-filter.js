require('dotenv').config();
const mongoose = require('mongoose');

async function checkSI001DateFilter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询SI-001的所有产品
    const allProducts = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    console.log(`📦 SI-001 所有产品: ${allProducts.length}个\n`);
    
    // 设置日期范围 (2026-01-01 到 2026-02-28)
    const start = new Date('2026-01-01');
    start.setHours(0, 0, 0, 0);
    const end = new Date('2026-02-28');
    end.setHours(23, 59, 59, 999);
    
    console.log(`📅 日期范围:`);
    console.log(`  开始: ${start.toISOString()}`);
    console.log(`  结束: ${end.toISOString()}\n`);
    
    // 查询在日期范围内的产品
    const filteredProducts = await AdminInventory.find({
      invoiceNumber: 'SI-001',
      createdAt: { $gte: start, $lte: end }
    }).lean();
    
    console.log(`📦 日期范围内的产品: ${filteredProducts.length}个\n`);
    
    // 检查每个产品的创建日期
    console.log(`📋 产品创建日期分布:`);
    const dateGroups = {};
    allProducts.forEach(p => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = { count: 0, total: 0 };
      }
      dateGroups[dateKey].count++;
      dateGroups[dateKey].total += p.costPrice * p.quantity;
    });
    
    Object.keys(dateGroups).sort().forEach(date => {
      const group = dateGroups[date];
      const inRange = new Date(date) >= start && new Date(date) <= end;
      console.log(`  ${date}: ${group.count}个产品, 总额€${group.total.toFixed(2)} ${inRange ? '✅ 在范围内' : '❌ 不在范围内'}`);
    });
    
    // 计算过滤后的总金额和税额
    let totalAmount = 0;
    let taxAmount = 0;
    
    filteredProducts.forEach(item => {
      const itemTotal = item.costPrice * item.quantity;
      totalAmount += itemTotal;
      
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        taxAmount += itemTotal - (itemTotal / 1.23);
      }
    });
    
    console.log(`\n📊 过滤后的汇总:`);
    console.log(`  总金额: €${totalAmount.toFixed(2)}`);
    console.log(`  税额: €${taxAmount.toFixed(2)}`);
    console.log(`  不含税: €${(totalAmount - taxAmount).toFixed(2)}`);
    
    // 检查€738.00是怎么来的
    console.log(`\n\n🔍 查找€738.00的来源:`);
    let sum = 0;
    let count = 0;
    for (const product of filteredProducts) {
      const itemTotal = product.costPrice * product.quantity;
      sum += itemTotal;
      count++;
      if (Math.abs(sum - 738) < 1) {
        console.log(`  前${count}个产品的总和: €${sum.toFixed(2)}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSI001DateFilter();
