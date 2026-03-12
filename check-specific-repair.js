const mongoose = require('mongoose');
require('dotenv').config();

async function checkSpecificRepair() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    console.log('🔍 查找"快速销售test"相关的维修记录\n');
    
    // 查询所有维修订单，查找包含"test"的
    const repairs = await RepairOrder.find({
      merchantId: merchantId,
      $or: [
        { deviceName: /test/i },
        { problemDescription: /test/i },
        { customerName: /test/i }
      ]
    }).lean();
    
    console.log(`📊 找到 ${repairs.length} 条包含"test"的维修记录\n`);
    
    if (repairs.length === 0) {
      console.log('❌ 没有找到相关记录');
      return;
    }
    
    // 显示所有找到的记录
    for (let i = 0; i < repairs.length; i++) {
      const repair = repairs[i];
      console.log(`\n========== 维修记录 ${i + 1} ==========`);
      console.log(`订单ID: ${repair._id}`);
      console.log(`设备名称: ${repair.deviceName || 'N/A'}`);
      console.log(`客户: ${repair.customerName || 'N/A'} (${repair.customerPhone || 'N/A'})`);
      console.log(`问题描述: ${repair.problemDescription || 'N/A'}`);
      console.log(`销售价格: €${repair.salePrice || 0}`);
      console.log(`维修成本: €${repair.repairCost || 0}`);
      console.log(`状态: ${repair.status}`);
      console.log(`快速销售: ${repair.isQuickSale || false}`);
      console.log(`创建时间: ${new Date(repair.createdAt).toLocaleString('zh-CN')}`);
      console.log(`更新时间: ${new Date(repair.updatedAt).toLocaleString('zh-CN')}`);
      console.log(`销售时间: ${repair.soldAt ? new Date(repair.soldAt).toLocaleString('zh-CN') : 'N/A'}`);
      
      // 检查是否是今天
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const saleDate = repair.soldAt ? new Date(repair.soldAt) : new Date(repair.updatedAt);
      const isToday = saleDate >= today && saleDate < tomorrow;
      
      console.log(`\n📅 日期检查:`);
      console.log(`   销售日期: ${saleDate.toLocaleString('zh-CN')}`);
      console.log(`   是否今天: ${isToday ? '是' : '否'}`);
      
      // 查找对应的销售记录
      console.log(`\n🔍 查找对应的销售记录:`);
      
      const relatedSale = await MerchantSale.findOne({
        merchantId: merchantId,
        'items.repairOrderId': repair._id
      }).lean();
      
      if (relatedSale) {
        console.log(`   ✅ 找到销售记录: ${relatedSale._id}`);
        console.log(`   销售日期: ${new Date(relatedSale.saleDate).toLocaleString('zh-CN')}`);
        console.log(`   状态: ${relatedSale.status}`);
        console.log(`   总金额: €${relatedSale.totalAmount}`);
        console.log(`   退款日期: ${relatedSale.refundDate ? new Date(relatedSale.refundDate).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   退款金额: €${relatedSale.refundAmount || 0}`);
        
        // 检查退款状态
        const isRefunded = relatedSale.status === 'refunded' || relatedSale.refundDate;
        console.log(`\n   📋 退款状态: ${isRefunded ? '已退款 ❌' : '未退款 ✅'}`);
        
        // 查找维修项目
        const repairItem = relatedSale.items.find(item => 
          item.repairOrderId && item.repairOrderId.toString() === repair._id.toString()
        );
        
        if (repairItem) {
          console.log(`\n   维修项目详情:`);
          console.log(`   - 产品名称: ${repairItem.productName}`);
          console.log(`   - 价格: €${repairItem.price}`);
          console.log(`   - 数量: ${repairItem.quantity}`);
        }
        
        // 检查退款项目
        if (relatedSale.refundItems && relatedSale.refundItems.length > 0) {
          console.log(`\n   退款项目 (${relatedSale.refundItems.length} 个):`);
          relatedSale.refundItems.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.productName}: €${item.price || item.totalAmount || 0}`);
          });
          
          // 检查这个维修订单是否在退款项目中
          const isThisRepairRefunded = relatedSale.refundItems.some(item => 
            item.productName && (
              item.productName.includes(repair.deviceName) ||
              item.productName.includes(repair.problemDescription)
            )
          );
          
          console.log(`\n   这个维修订单是否在退款项目中: ${isThisRepairRefunded ? '是 ❌' : '否 ✅'}`);
        }
        
      } else {
        console.log(`   ❌ 未找到对应的销售记录`);
      }
      
      // 判断是否应该显示在本日维修明细中
      console.log(`\n📊 是否应该显示在本日维修明细:`);
      console.log(`   1. 状态是sold: ${repair.status === 'sold' ? '✅' : '❌'}`);
      console.log(`   2. 是今天: ${isToday ? '✅' : '❌'}`);
      
      if (relatedSale) {
        const isRefunded = relatedSale.status === 'refunded' || relatedSale.refundDate;
        console.log(`   3. 未退款: ${!isRefunded ? '✅' : '❌'}`);
        
        const shouldShow = repair.status === 'sold' && isToday && !isRefunded;
        console.log(`\n   结论: ${shouldShow ? '应该显示 ✅' : '不应该显示 ❌'}`);
      } else {
        console.log(`   3. 未退款: ⚠️ 无法确定（没有销售记录）`);
      }
      
      console.log(`\n========================================`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkSpecificRepair();
