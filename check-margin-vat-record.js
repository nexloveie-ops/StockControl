const mongoose = require('mongoose');
require('dotenv').config();

async function checkMarginVATRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    const productName = 'Used Device - TEST IPHONE 11';
    
    console.log(`🔍 查询产品: ${productName}\n`);
    
    // 查询包含这个产品的销售记录
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.productName': new RegExp('TEST IPHONE 11', 'i')
    }).lean();
    
    console.log(`📊 找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, i) => {
      console.log(`\n========== 销售记录 ${i + 1} ==========`);
      console.log(`订单ID: ${sale._id}`);
      console.log(`销售日期: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
      console.log(`状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log(`客户: ${sale.customerName || 'N/A'} (${sale.customerPhone || 'N/A'})`);
      console.log(`支付方式: ${sale.paymentMethod}`);
      console.log('');
      
      // 查找包含TEST IPHONE 11的项目
      const targetItems = sale.items.filter(item => 
        item.productName && item.productName.includes('TEST IPHONE 11')
      );
      
      console.log(`包含目标产品的项目 (${targetItems.length} 个):`);
      targetItems.forEach((item, j) => {
        console.log(`\n  项目 ${j + 1}:`);
        console.log(`  - 产品名称: ${item.productName}`);
        console.log(`  - 数量: ${item.quantity}`);
        console.log(`  - 价格: €${item.price}`);
        console.log(`  - 成本: €${item.costPrice}`);
        console.log(`  - 税务分类: ${item.taxClassification}`);
        console.log(`  - 序列号: ${item.serialNumber || 'N/A'}`);
        console.log(`  - IMEI: ${item.imei || 'N/A'}`);
        console.log(`  - 快速销售: ${item.isQuickSale || false}`);
        console.log(`  - 模板产品: ${item.isTemplate || false}`);
        console.log(`  - inventoryId: ${item.inventoryId || 'N/A'}`);
        console.log(`  - templateId: ${item.templateId || 'N/A'}`);
        console.log(`  - 利润: €${(item.price - item.costPrice) * item.quantity}`);
        
        // 分析为什么会被归类为Margin VAT
        console.log(`\n  📋 税务分类分析:`);
        if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
          console.log(`  ✅ 税务分类明确设置为: ${item.taxClassification}`);
        } else if (item.taxClassification === 'Margin VAT') {
          console.log(`  ✅ 税务分类设置为: Margin VAT (字符串格式)`);
        } else {
          console.log(`  ❓ 税务分类为: ${item.taxClassification}`);
          console.log(`  ❌ 这不应该出现在Margin VAT报表中！`);
        }
        
        // 检查产品名称中的标记
        if (item.productName.includes('⚡')) {
          console.log(`  ⚡ 产品名称包含快速销售标记`);
        }
        if (item.productName.includes('♻️')) {
          console.log(`  ♻️ 产品名称包含二手设备标记`);
        }
      });
      
      console.log('\n========================================\n');
    });
    
    // 检查是否有其他Margin VAT的记录
    console.log('\n📊 所有Margin VAT销售记录:\n');
    
    const marginVATSales = await MerchantSale.find({
      merchantId: merchantId,
      status: 'completed',
      'items.taxClassification': { $in: ['MARGIN_VAT_0', 'MARGIN_VAT', 'Margin VAT'] }
    }).lean();
    
    console.log(`找到 ${marginVATSales.length} 条包含Margin VAT的销售记录\n`);
    
    marginVATSales.forEach((sale, i) => {
      const marginItems = sale.items.filter(item => 
        item.taxClassification === 'MARGIN_VAT_0' || 
        item.taxClassification === 'MARGIN_VAT' ||
        item.taxClassification === 'Margin VAT'
      );
      
      console.log(`${i + 1}. 订单 ${sale._id.toString().slice(-8)}`);
      console.log(`   日期: ${new Date(sale.saleDate).toLocaleDateString('zh-CN')}`);
      console.log(`   Margin VAT项目数: ${marginItems.length}`);
      marginItems.forEach(item => {
        console.log(`   - ${item.productName}: €${item.price} (成本: €${item.costPrice}, 税分类: ${item.taxClassification})`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

checkMarginVATRecord();
