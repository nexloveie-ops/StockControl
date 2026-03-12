const mongoose = require('mongoose');
require('dotenv').config();

async function checkAnyRepairs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    console.log(`📊 查询所有维修记录统计\n`);
    
    // 统计各种状态的维修记录
    const totalCount = await RepairOrder.countDocuments({ merchantId });
    const soldCount = await RepairOrder.countDocuments({ merchantId, status: 'sold' });
    const pendingCount = await RepairOrder.countDocuments({ merchantId, status: 'pending' });
    const completedCount = await RepairOrder.countDocuments({ merchantId, status: 'completed' });
    
    console.log(`总维修记录数: ${totalCount}`);
    console.log(`已销售 (sold): ${soldCount}`);
    console.log(`待处理 (pending): ${pendingCount}`);
    console.log(`已完成 (completed): ${completedCount}`);
    
    // 查询最近10条维修记录
    console.log(`\n📋 最近10条维修记录:\n`);
    
    const recentRepairs = await RepairOrder.find({ merchantId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
    
    if (recentRepairs.length === 0) {
      console.log('❌ 没有找到任何维修记录');
      return;
    }
    
    // 获取相关的销售记录
    const repairIds = recentRepairs.map(r => r._id);
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.repairOrderId': { $in: repairIds }
    }).lean();
    
    const repairIdToSaleMap = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.repairOrderId) {
          repairIdToSaleMap[item.repairOrderId.toString()] = sale;
        }
      });
    });
    
    for (let i = 0; i < recentRepairs.length; i++) {
      const repair = recentRepairs[i];
      const relatedSale = repairIdToSaleMap[repair._id.toString()];
      
      console.log(`\n========== 记录 ${i + 1} ==========`);
      console.log(`订单ID: ${repair._id}`);
      console.log(`设备: ${repair.deviceName || '未知'}`);
      console.log(`客户: ${repair.customerName || '未知'}`);
      console.log(`问题: ${repair.problemDescription || 'N/A'}`);
      
      if (repair.services && repair.services.length > 0) {
        console.log(`服务: ${repair.services.map(s => s.name).join(', ')}`);
      }
      
      console.log(`价格: €${repair.salePrice || 0}`);
      console.log(`状态: ${repair.status}`);
      console.log(`快速销售: ${repair.isQuickSale ? '⚡ 是' : '否'}`);
      console.log(`创建时间: ${new Date(repair.createdAt).toLocaleString('zh-CN')}`);
      console.log(`更新时间: ${new Date(repair.updatedAt).toLocaleString('zh-CN')}`);
      
      if (repair.soldAt) {
        console.log(`销售时间: ${new Date(repair.soldAt).toLocaleString('zh-CN')}`);
      }
      
      if (relatedSale) {
        const isRefunded = relatedSale.status === 'refunded' || relatedSale.refundDate;
        console.log(`销售记录: ${relatedSale._id} (${relatedSale.status}${isRefunded ? ' - 已退款' : ''})`);
      }
    }
    
    console.log(`\n========================================`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkAnyRepairs();
