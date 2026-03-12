const mongoose = require('mongoose');
require('dotenv').config();

async function checkQuickSaleRepair() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const RepairOrder = require('./models/RepairOrder');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    
    console.log('🔍 查找快速销售的维修记录\n');
    
    // 查询所有已销售的维修订单
    const repairs = await RepairOrder.find({
      merchantId: merchantId,
      status: 'sold'
    }).lean();
    
    console.log(`📊 所有已销售的维修订单: ${repairs.length} 条\n`);
    
    // 查找快速销售的维修记录
    const quickSaleRepairs = repairs.filter(r => r.isQuickSale);
    
    console.log(`⚡ 快速销售的维修记录: ${quickSaleRepairs.length} 条\n`);
    
    if (quickSaleRepairs.length > 0) {
      quickSaleRepairs.forEach((repair, i) => {
        console.log(`${i + 1}. ${repair.deviceName || 'N/A'}`);
        console.log(`   订单ID: ${repair._id}`);
        console.log(`   客户: ${repair.customerName || 'N/A'} (${repair.customerPhone || 'N/A'})`);
        console.log(`   问题描述: ${repair.problemDescription || 'N/A'}`);
        console.log(`   销售价格: €${repair.salePrice || 0}`);
        console.log(`   维修成本: €${repair.repairCost || 0}`);
        console.log(`   状态: ${repair.status}`);
        console.log(`   快速销售: ${repair.isQuickSale || false}`);
        console.log(`   创建时间: ${new Date(repair.createdAt).toLocaleString('zh-CN')}`);
        console.log(`   销售时间: ${repair.soldAt ? new Date(repair.soldAt).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   更新时间: ${new Date(repair.updatedAt).toLocaleString('zh-CN')}`);
        console.log('');
      });
    }
    
    // 查找今天的记录
    console.log('\n📅 今天的已销售维修记录:\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRepairs = repairs.filter(repair => {
      const saleDate = repair.soldAt ? new Date(repair.soldAt) : new Date(repair.updatedAt);
      return saleDate >= today && saleDate < tomorrow;
    });
    
    console.log(`找到 ${todayRepairs.length} 条今天的记录\n`);
    
    todayRepairs.forEach((repair, i) => {
      const saleDate = repair.soldAt ? new Date(repair.soldAt) : new Date(repair.updatedAt);
      console.log(`${i + 1}. ${repair.deviceName || 'N/A'}`);
      console.log(`   订单ID: ${repair._id}`);
      console.log(`   销售时间: ${saleDate.toLocaleString('zh-CN')}`);
      console.log(`   销售价格: €${repair.salePrice || 0}`);
      console.log(`   快速销售: ${repair.isQuickSale || false}`);
      console.log(`   问题描述: ${repair.problemDescription || 'N/A'}`);
      console.log('');
    });
    
    // 检查是否有对应的销售记录
    console.log('\n🔍 检查销售记录:\n');
    
    for (const repair of todayRepairs) {
      console.log(`维修订单: ${repair._id.toString().slice(-8)}`);
      
      const relatedSale = await MerchantSale.findOne({
        merchantId: merchantId,
        'items.repairOrderId': repair._id
      }).lean();
      
      if (relatedSale) {
        console.log(`  ✅ 找到销售记录: ${relatedSale._id.toString().slice(-8)}`);
        console.log(`     状态: ${relatedSale.status}`);
        console.log(`     退款日期: ${relatedSale.refundDate ? new Date(relatedSale.refundDate).toLocaleDateString('zh-CN') : 'N/A'}`);
        
        const repairItem = relatedSale.items.find(item => 
          item.repairOrderId && item.repairOrderId.toString() === repair._id.toString()
        );
        
        if (repairItem) {
          console.log(`     维修项目: ${repairItem.productName}`);
          console.log(`     价格: €${repairItem.price}`);
        }
      } else {
        console.log(`  ❌ 未找到销售记录`);
      }
      console.log('');
    }
    
    // 分析问题
    console.log('\n📋 问题分析:\n');
    
    const quickSaleToday = todayRepairs.filter(r => r.isQuickSale);
    
    if (quickSaleToday.length > 0) {
      console.log(`❌ 问题：今天有 ${quickSaleToday.length} 条快速销售的维修记录`);
      console.log('');
      console.log('快速销售的维修服务不应该出现在"本日维修明细"中，因为：');
      console.log('1. 快速销售是直接销售，没有维修订单流程');
      console.log('2. 本日维修明细应该只显示真实的维修订单');
      console.log('');
      console.log('建议：在过滤条件中排除 isQuickSale === true 的记录');
    } else {
      console.log('✅ 今天没有快速销售的维修记录');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkQuickSaleRepair();
