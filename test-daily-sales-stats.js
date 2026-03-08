const mongoose = require('mongoose');
require('dotenv').config();

async function testDailySalesStats() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 查询日期: ${today.toLocaleDateString('zh-CN')}\n`);
    
    // 查询今天的所有completed订单
    const sales = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    }).sort({ saleDate: -1 });
    
    console.log(`📊 今天的completed订单: ${sales.length} 条\n`);
    
    let totalFromDB = 0;
    let actualTotal = 0;
    let totalRefund = 0;
    
    sales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 订单 ${sale._id}`);
      console.log(`   时间: ${sale.saleDate.toLocaleTimeString('zh-CN')}`);
      console.log(`   订单总额: €${sale.totalAmount}`);
      console.log(`   退款金额: €${sale.refundAmount || 0}`);
      console.log(`   实际销售额: €${sale.totalAmount - (sale.refundAmount || 0)}`);
      
      totalFromDB += sale.totalAmount;
      totalRefund += sale.refundAmount || 0;
      actualTotal += sale.totalAmount - (sale.refundAmount || 0);
      
      if (sale.refundItems && sale.refundItems.length > 0) {
        console.log(`   ⚠️  部分退款: ${sale.refundItems.length} 个产品`);
      }
    });
    
    console.log('\n\n📈 统计汇总:');
    console.log(`订单总额（不考虑退款）: €${totalFromDB.toFixed(2)}`);
    console.log(`总退款金额: €${totalRefund.toFixed(2)}`);
    console.log(`实际销售额（扣除退款）: €${actualTotal.toFixed(2)}`);
    
    // 测试当前的聚合查询
    console.log('\n\n🧪 测试当前的聚合查询:');
    const dailySales = await MerchantSale.aggregate([
      {
        $match: {
          merchantId: 'Mobile123',
          saleDate: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const currentResult = dailySales.length > 0 ? dailySales[0].total : 0;
    console.log(`当前API返回: €${currentResult.toFixed(2)}`);
    console.log(`❌ 问题: 没有扣除退款金额 €${totalRefund.toFixed(2)}`);
    
    // 测试正确的聚合查询
    console.log('\n\n✅ 正确的聚合查询:');
    const correctDailySales = await MerchantSale.aggregate([
      {
        $match: {
          merchantId: 'Mobile123',
          saleDate: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $project: {
          actualAmount: {
            $subtract: [
              '$totalAmount',
              { $ifNull: ['$refundAmount', 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$actualAmount' }
        }
      }
    ]);
    
    const correctResult = correctDailySales.length > 0 ? correctDailySales[0].total : 0;
    console.log(`正确的结果: €${correctResult.toFixed(2)}`);
    console.log(`✅ 已扣除退款金额`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testDailySalesStats();
