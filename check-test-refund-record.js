const mongoose = require('mongoose');
require('dotenv').config();

const RepairOrder = require('./models/RepairOrder');
const MerchantSale = require('./models/MerchantSale');

async function checkTestRefundRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 1. 查找设备名称为 test-refund 的维修订单
    console.log('========== 查找 RepairOrder 表 ==========');
    const repairs = await RepairOrder.find({ 
      deviceName: /test-refund/i,
      merchantId: 'Mobile123'
    }).lean();
    
    console.log(`找到 ${repairs.length} 条维修订单:\n`);
    
    repairs.forEach((repair, index) => {
      console.log(`维修订单 ${index + 1}:`);
      console.log('  ID:', repair._id);
      console.log('  设备名称:', repair.deviceName);
      console.log('  问题描述:', repair.problemDescription);
      console.log('  状态:', repair.status);
      console.log('  售价:', repair.salePrice);
      console.log('');
    });
    
    // 2. 查找销售记录中包含 test-refund 的记录
    console.log('\n========== 查找 MerchantSale 表 ==========');
    const sales = await MerchantSale.find({
      merchantId: 'Mobile123',
      'items.productName': /test-refund/i
    }).lean();
    
    console.log(`找到 ${sales.length} 条销售记录:\n`);
    
    sales.forEach((sale, index) => {
      console.log(`销售记录 ${index + 1}:`);
      console.log('  销售ID:', sale._id);
      console.log('  状态:', sale.status);
      console.log('  日期:', sale.date || sale.saleDate);
      
      sale.items.forEach((item, i) => {
        if (item.productName && item.productName.toLowerCase().includes('test-refund')) {
          console.log(`  项目 ${i + 1}:`);
          console.log('    产品名称:', item.productName);
          console.log('    价格:', item.price);
          console.log('    快速销售:', item.isQuickSale);
          console.log('    快速销售分类:', item.quickSaleCategory);
          console.log('    维修订单ID:', item.repairOrderId);
        }
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkTestRefundRecord();
