require('dotenv').config();
const mongoose = require('mongoose');

async function checkMerchantSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const MerchantSale = mongoose.model('MerchantSale', new mongoose.Schema({}, { strict: false }));
    
    // 查询本月的销售记录
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const sales = await MerchantSale.find({
      merchantId: 'MurrayRanelagh',
      saleDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      },
      status: { $ne: 'REFUNDED' }
    }).lean();
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`销售 ${index + 1}:`);
      console.log('  _id:', sale._id);
      console.log('  saleNumber:', sale.saleNumber);
      console.log('  saleType:', sale.saleType);
      console.log('  saleDate:', sale.saleDate);
      console.log('  status:', sale.status);
      console.log('  items:');
      sale.items.forEach((item, i) => {
        console.log(`    Item ${i + 1}:`);
        console.log('      productName:', item.productName);
        console.log('      model:', item.model);
        console.log('      color:', item.color);
        console.log('      quantity:', item.quantity);
        console.log('      price:', item.price);
        console.log('      isRepairItem:', item.isRepairItem);
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkMerchantSales();
