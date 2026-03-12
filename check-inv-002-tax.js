const mongoose = require('mongoose');
require('dotenv').config();

const MerchantInventory = require('./models/MerchantInventory');
const AdminInventory = require('./models/AdminInventory');

async function checkINV002Tax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const invoiceNumber = 'INV-002';
    const merchantId = 'Mobile123';

    console.log(`🔍 查询发票号: ${invoiceNumber}`);
    console.log('='.repeat(100));

    // 1. 查询AdminInventory
    const adminItems = await AdminInventory.find({
      merchantId: merchantId,
      invoiceNumber: invoiceNumber
    }).lean();

    console.log(`\n📦 AdminInventory 记录: ${adminItems.length} 条`);

    // 2. 查询MerchantInventory（从notes提取）
    const merchantItems = await MerchantInventory.find({
      merchantId: merchantId,
      notes: { $regex: new RegExp(`发票号:\\s*${invoiceNumber}`, 'i') }
    }).lean();

    console.log(`📦 MerchantInventory 记录: ${merchantItems.length} 条`);

    // 合并所有记录
    const allItems = [...adminItems, ...merchantItems];

    if (allItems.length === 0) {
      console.log('\n❌ 未找到该发票的任何记录');
      return;
    }

    console.log(`\n📊 总记录数: ${allItems.length} 条`);
    console.log('='.repeat(100));

    let totalAmount = 0;
    let totalTax = 0;

    console.log('\n📋 商品明细:\n');

    allItems.forEach((item, index) => {
      const itemTotal = (item.costPrice || 0) * (item.quantity || 1);
      const retailTotal = (item.retailPrice || 0) * (item.quantity || 1);
      let itemTax = 0;
      let taxCalcMethod = '';

      // 税额计算逻辑（基于零售价）
      if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
        // 使用零售价计算税额
        const priceForTax = item.retailPrice || item.costPrice || 0;
        itemTax = priceForTax * (item.quantity || 1) * (23 / 123);
        taxCalcMethod = `€${priceForTax.toFixed(2)} × ${item.quantity || 1} × (23/123) = €${itemTax.toFixed(2)}`;
      } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%' || 
                 item.taxClassification === 'SERVICE_VAT_13_5') {
        const priceForTax = item.retailPrice || item.costPrice || 0;
        itemTax = priceForTax * (item.quantity || 1) * (13.5 / 113.5);
        taxCalcMethod = `€${priceForTax.toFixed(2)} × ${item.quantity || 1} × (13.5/113.5) = €${itemTax.toFixed(2)}`;
      } else if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'Margin VAT' ||
                 item.taxClassification === 'VAT_0' || item.taxClassification === 'VAT 0%') {
        itemTax = 0;
        taxCalcMethod = '免税或Margin VAT (税额 = 0)';
      } else {
        taxCalcMethod = `未知税务分类: ${item.taxClassification}`;
      }

      totalAmount += itemTotal;
      totalTax += itemTax;

      console.log(`${index + 1}. ${item.productName || item.name || '未命名产品'}`);
      console.log(`   品牌: ${item.brand || 'N/A'}`);
      console.log(`   型号: ${item.model || 'N/A'}`);
      console.log(`   数量: ${item.quantity || 1}`);
      console.log(`   成本价: €${(item.costPrice || 0).toFixed(2)}`);
      console.log(`   零售价: €${(item.retailPrice || 0).toFixed(2)}`);
      console.log(`   成本小计: €${itemTotal.toFixed(2)}`);
      console.log(`   零售小计: €${retailTotal.toFixed(2)}`);
      console.log(`   税务分类: ${item.taxClassification || 'N/A'}`);
      console.log(`   税额计算: ${taxCalcMethod}`);
      console.log(`   税额: €${itemTax.toFixed(2)}`);
      
      if (item.serialNumber) {
        console.log(`   序列号: ${item.serialNumber}`);
      }
      
      console.log('');
    });

    console.log('='.repeat(100));
    console.log('\n💰 汇总信息:');
    console.log(`   总金额（含税）: €${totalAmount.toFixed(2)}`);
    console.log(`   总税额: €${totalTax.toFixed(2)}`);
    console.log(`   不含税金额: €${(totalAmount - totalTax).toFixed(2)}`);

    console.log('\n📝 税额计算说明:');
    console.log('   • VAT 23%: 税额 = 零售价 × (23/123)');
    console.log('   • VAT 13.5%: 税额 = 零售价 × (13.5/113.5)');
    console.log('   • Margin VAT / VAT 0%: 税额 = 0');

    // 按税务分类统计
    console.log('\n📊 按税务分类统计:');
    const taxStats = {};
    allItems.forEach(item => {
      const taxClass = item.taxClassification || 'N/A';
      if (!taxStats[taxClass]) {
        taxStats[taxClass] = { count: 0, amount: 0, tax: 0 };
      }
      
      const itemTotal = (item.costPrice || 0) * (item.quantity || 1);
      let itemTax = 0;
      
      if (taxClass === 'VAT_23' || taxClass === 'VAT 23%') {
        const priceForTax = item.retailPrice || item.costPrice || 0;
        itemTax = priceForTax * (item.quantity || 1) * (23 / 123);
      } else if (taxClass === 'VAT_13_5' || taxClass === 'VAT 13.5%' || taxClass === 'SERVICE_VAT_13_5') {
        const priceForTax = item.retailPrice || item.costPrice || 0;
        itemTax = priceForTax * (item.quantity || 1) * (13.5 / 113.5);
      }
      
      taxStats[taxClass].count += 1;
      taxStats[taxClass].amount += itemTotal;
      taxStats[taxClass].tax += itemTax;
    });

    Object.entries(taxStats).forEach(([taxClass, stats]) => {
      console.log(`   ${taxClass}:`);
      console.log(`      商品数: ${stats.count}`);
      console.log(`      金额: €${stats.amount.toFixed(2)}`);
      console.log(`      税额: €${stats.tax.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkINV002Tax();
