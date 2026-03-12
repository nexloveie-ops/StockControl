const mongoose = require('mongoose');
require('dotenv').config();

const RepairOrder = require('./models/RepairOrder');
const MerchantSale = require('./models/MerchantSale');

async function checkTestRepairStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查找设备名称为 test 的维修订单
    const repairOrder = await RepairOrder.findOne({ 
      deviceName: 'test'
    }).lean();
    
    if (!repairOrder) {
      console.log('❌ 未找到设备名称为 test 的维修订单');
      return;
    }
    
    console.log('📋 维修订单信息:');
    console.log('ID:', repairOrder._id);
    console.log('设备名称:', repairOrder.deviceName);
    console.log('问题描述:', repairOrder.issueDescription);
    console.log('状态:', repairOrder.status);
    console.log('退款日期:', repairOrder.refundDate);
    console.log('销售日期:', repairOrder.soldDate);
    console.log('销售价格:', repairOrder.salePrice);
    console.log('');
    
    // 查找相关的销售记录
    console.log('🔍 查找相关销售记录...');
    const sales = await MerchantSale.find({
      'items.repairOrderId': repairOrder._id
    }).lean();
    
    console.log(`找到 ${sales.length} 条销售记录:\n`);
    
    sales.forEach((sale, index) => {
      console.log(`销售记录 ${index + 1}:`);
      console.log('  销售ID:', sale._id);
      console.log('  销售日期:', sale.date || sale.saleDate);
      console.log('  状态:', sale.status);
      console.log('  退款日期:', sale.refundDate);
      console.log('  退款金额:', sale.refundAmount);
      console.log('  支付方式:', sale.paymentMethod);
      console.log('  总金额:', sale.totalAmount);
      
      // 查找包含这个维修订单的项目
      const repairItem = sale.items.find(item => 
        item.repairOrderId && item.repairOrderId.toString() === repairOrder._id.toString()
      );
      
      if (repairItem) {
        console.log('  维修项目:');
        console.log('    产品名称:', repairItem.productName);
        console.log('    价格:', repairItem.price);
        console.log('    数量:', repairItem.quantity);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkTestRepairStatus();
