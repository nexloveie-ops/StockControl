const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    console.log('数据库名称:', mongoose.connection.name);
    console.log('连接URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    console.log('');

    // 获取所有集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log(`=== 数据库中的集合 ===`);
    console.log(`找到 ${collections.length} 个集合\n`);
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`${collection.name}: ${count} 条记录`);
    }

    // 特别检查sales集合
    console.log('\n=== 检查Sales集合 ===');
    const salesCount = await mongoose.connection.db.collection('sales').countDocuments();
    console.log(`Sales集合记录数: ${salesCount}`);
    
    if (salesCount > 0) {
      console.log('\n最近的5条销售记录:');
      const recentSales = await mongoose.connection.db.collection('sales')
        .find({})
        .sort({ saleDate: -1 })
        .limit(5)
        .toArray();
      
      recentSales.forEach((sale, index) => {
        console.log(`\n${index + 1}. ${sale.invoiceNumber}`);
        console.log(`   merchantId: ${sale.merchantId}`);
        console.log(`   saleDate: ${sale.saleDate}`);
        console.log(`   totalAmount: €${sale.totalAmount}`);
        console.log(`   status: ${sale.status}`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkCollections();
