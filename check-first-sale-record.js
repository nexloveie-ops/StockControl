const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSale = require('./models/MerchantSale');
const RepairOrder = require('./models/RepairOrder');

async function checkFirstSaleRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 获取最新的销售记录
    const sales = await MerchantSale.find({ merchantId: 'Mobile123' })
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    console.log(`找到 ${sales.length} 条最新销售记录:\n`);
    
    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      console.log(`\n========== 销售记录 ${i + 1} ==========`);
      console.log('销售ID:', sale._id);
      console.log('销售日期:', sale.date || sale.saleDate);
      console.log('状态:', sale.status);
      console.log('退款日期:', sale.refundDate);
      console.log('退款金额:', sale.refundAmount);
      console.log('支付方式:', sale.paymentMethod);
      console.log('总金额:', sale.totalAmount);
      console.log('退款项目:', sale.refundItems);
      
      console.log('\n项目列表:');
      for (const item of sale.items) {
        console.log('  -', item.productName);
        console.log('    价格:', item.price);
        console.log('    数量:', item.quantity);
        console.log('    库存ID:', item.inventoryId);
        console.log('    维修订单ID:', item.repairOrderId);
        console.log('    快速销售:', item.isQuickSale);
        
        // 如果有维修订单ID，查询维修订单状态
        if (item.repairOrderId) {
          const repair = await RepairOrder.findById(item.repairOrderId).lean();
          if (repair) {
            console.log('    维修订单状态:', repair.status);
            console.log('    维修订单退款日期:', repair.refundDate);
            console.log('    维修订单设备名称:', repair.deviceName);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkFirstSaleRecord();
