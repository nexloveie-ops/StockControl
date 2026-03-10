const mongoose = require('mongoose');
require('dotenv').config();

async function deleteOldSales() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 设置截止时间：今天15:27
    const cutoffTime = new Date();
    cutoffTime.setHours(15, 27, 0, 0);
    
    console.log(`🗑️  准备删除 ${cutoffTime.toLocaleString('zh-CN')} 及之前的销售记录\n`);
    
    // 查询要删除的记录
    const salesToDelete = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: { $lte: cutoffTime }
    }).sort({ saleDate: -1 });
    
    console.log(`📊 找到 ${salesToDelete.length} 条记录\n`);
    
    if (salesToDelete.length === 0) {
      console.log('没有需要删除的记录');
      return;
    }
    
    // 显示要删除的记录
    salesToDelete.forEach((sale, index) => {
      console.log(`${index + 1}. 订单 ${sale._id}`);
      console.log(`   时间: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   金额: €${sale.totalAmount}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   产品数: ${sale.items.length}`);
    });
    
    console.log('\n⚠️  确认删除这些记录...\n');
    
    // 删除记录
    const result = await MerchantSale.deleteMany({
      merchantId: 'Mobile123',
      saleDate: { $lte: cutoffTime }
    });
    
    console.log(`✅ 已删除 ${result.deletedCount} 条销售记录`);
    
    // 验证删除结果
    const remainingSales = await MerchantSale.find({
      merchantId: 'Mobile123'
    }).sort({ saleDate: -1 });
    
    console.log(`\n📊 剩余销售记录: ${remainingSales.length} 条`);
    
    if (remainingSales.length > 0) {
      console.log('\n剩余记录:');
      remainingSales.forEach((sale, index) => {
        console.log(`${index + 1}. ${sale.saleDate.toLocaleString('zh-CN')} - €${sale.totalAmount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

deleteOldSales();
