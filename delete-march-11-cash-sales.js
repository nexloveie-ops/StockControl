const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSale = require('./models/MerchantSale');

async function deleteMarch11CashSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 要删除的两条记录的ID
    const saleIds = [
      '69b1b2960988845670db0d99',  // 第1笔：€20.00
      '69b1b5f90988845670db10bb'   // 第2笔：€40.00
    ];

    console.log('🗑️  准备删除以下销售记录:');
    console.log('   ID 1:', saleIds[0]);
    console.log('   ID 2:', saleIds[1]);
    console.log('');

    // 先查询这些记录的详细信息
    for (const id of saleIds) {
      const sale = await MerchantSale.findById(id);
      if (sale) {
        console.log(`📋 记录详情 (${id}):`);
        console.log(`   时间: ${sale.saleDate.toLocaleString('zh-CN', { timeZone: 'UTC' })}`);
        console.log(`   金额: €${sale.totalAmount?.toFixed(2)}`);
        console.log(`   支付方式: ${sale.paymentMethod}`);
        console.log(`   商品: ${sale.items.map(i => i.productName || i.name).join(', ')}`);
        console.log('');
      } else {
        console.log(`❌ 未找到记录: ${id}\n`);
      }
    }

    // 执行删除
    const result = await MerchantSale.deleteMany({
      _id: { $in: saleIds }
    });

    console.log('✅ 删除完成!');
    console.log(`   删除数量: ${result.deletedCount} 条`);

    if (result.deletedCount === 2) {
      console.log('\n✅ 两条现金销售记录已成功删除');
    } else if (result.deletedCount === 0) {
      console.log('\n⚠️  没有删除任何记录（可能记录不存在）');
    } else {
      console.log(`\n⚠️  只删除了 ${result.deletedCount} 条记录`);
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

deleteMarch11CashSales();
