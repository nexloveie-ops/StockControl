const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllTodayRepairs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 查询日期: ${today.toLocaleString('zh-CN')} - ${tomorrow.toLocaleString('zh-CN')}\n`);
    
    // 查询所有今天已销售的维修订单
    const repairs = await RepairOrder.find({
      merchantId: merchantId,
      status: 'sold',
      soldAt: {
        $gte: today,
        $lt: tomorrow
      }
    }).lean();
    
    console.log(`📊 找到 ${repairs.length} 条今天已销售的维修记录\n`);
    
    if (repairs.length === 0) {
      console.log('❌ 没有找到今天的维修记录');
      return;
    }
    
    // 获取所有相关的销售记录
    const repairIds = repairs.map(r => r._id);
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.repairOrderId': { $in: repairIds }
    }).lean();
    
    // 创建维修ID到销售记录的映射
    const repairIdToSaleMap = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.repairOrderId) {
          repairIdToSaleMap[item.repairOrderId.toString()] = sale;
        }
      });
    });
    
    console.log(`🔗 找到 ${sales.length} 条相关销售记录\n`);
    
    // 显示所有记录
    for (let i = 0; i < repairs.length; i++) {
      const repair = repairs[i];
      const relatedSale = repairIdToSaleMap[repair._id.toString()];
      
      console.log(`\n========== 维修记录 ${i + 1} ==========`);
      console.log(`订单ID: ${repair._id}`);
      console.log(`设备名称: ${repair.deviceName || 'N/A'}`);
      console.log(`客户: ${repair.customerName || '未知'} (${repair.customerPhone || 'N/A'})`);
      console.log(`问题描述: ${repair.problemDescription || 'N/A'}`);
      
      // 显示服务信息
      if (repair.services && repair.services.length > 0) {
        console.log(`服务 (${repair.services.length} 个):`);
        repair.services.forEach((service, idx) => {
          console.log(`  ${idx + 1}. ${service.name}: €${service.price}`);
        });
      }
      
      console.log(`销售价格: €${repair.salePrice || 0}`);
      console.log(`状态: ${repair.status}`);
      console.log(`快速销售: ${repair.isQuickSale ? '⚡ 是' : '否'}`);
      console.log(`销售时间: ${repair.soldAt ? new Date(repair.soldAt).toLocaleString('zh-CN') : 'N/A'}`);
      
      // 检查销售记录
      if (relatedSale) {
        console.log(`\n📋 销售记录:`);
        console.log(`   销售ID: ${relatedSale._id}`);
        console.log(`   状态: ${relatedSale.status}`);
        console.log(`   总金额: €${relatedSale.totalAmount}`);
        console.log(`   退款日期: ${relatedSale.refundDate ? new Date(relatedSale.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   退款金额: €${relatedSale.refundAmount || 0}`);
        
        const isRefunded = relatedSale.status === 'refunded' || relatedSale.refundDate;
        console.log(`   退款状态: ${isRefunded ? '已退款 ❌' : '未退款 ✅'}`);
        
        // 显示退款项目
        if (relatedSale.refundItems && relatedSale.refundItems.length > 0) {
          console.log(`\n   退款项目 (${relatedSale.refundItems.length} 个):`);
          relatedSale.refundItems.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.productName}: €${item.price || item.totalAmount || 0} x ${item.quantity || 1}`);
            if (item.serialNumber) {
              console.log(`      序列号: ${item.serialNumber}`);
            }
          });
        }
        
        // 判断是否应该显示
        console.log(`\n   是否应该显示: ${!isRefunded ? '✅ 是' : '❌ 否（已退款）'}`);
      } else {
        console.log(`\n📋 销售记录: ❌ 未找到`);
        console.log(`   是否应该显示: ✅ 是（无销售记录，无法确认退款）`);
      }
      
      console.log(`========================================`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkAllTodayRepairs();
