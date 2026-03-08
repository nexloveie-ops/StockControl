const mongoose = require('mongoose');
require('dotenv').config();

async function testStats() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const RepairOrder = require('./models/RepairOrder');
    
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 查询日期: ${today.toLocaleDateString('zh-CN')}\n`);
    
    // 1. 查询维修订单收入
    const repairOrders = await RepairOrder.find({
      merchantId: 'Mobile123',
      soldDate: { $gte: today, $lt: tomorrow },
      status: 'sold'
    });
    
    const repairOrdersTotal = repairOrders.reduce((sum, order) => sum + (order.salePrice || 0), 0);
    
    console.log(`🔧 维修订单收入:`);
    console.log(`   数量: ${repairOrders.length}`);
    console.log(`   总额: €${repairOrdersTotal.toFixed(2)}\n`);
    
    // 2. 查询快速销售的service收入
    const serviceSales = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed',
      'items.isQuickSale': true,
      'items.quickSaleCategory': 'services'
    });
    
    let serviceTotal = 0;
    let serviceCount = 0;
    
    serviceSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.isQuickSale && item.quickSaleCategory === 'services') {
          serviceTotal += item.price * item.quantity;
          serviceCount++;
          console.log(`⚡ 快速销售Service: ${item.productName} - €${(item.price * item.quantity).toFixed(2)}`);
        }
      });
    });
    
    console.log(`\n⚡ 快速销售Service收入:`);
    console.log(`   数量: ${serviceCount}`);
    console.log(`   总额: €${serviceTotal.toFixed(2)}\n`);
    
    // 3. 总计
    const totalRepairs = repairOrdersTotal + serviceTotal;
    console.log(`💰 本日维修总收入: €${totalRepairs.toFixed(2)}`);
    console.log(`   = 维修订单 €${repairOrdersTotal.toFixed(2)} + 快速销售Service €${serviceTotal.toFixed(2)}\n`);
    
    // 4. 测试聚合查询
    console.log('🧪 测试聚合查询...\n');
    
    const dailyRepairsFromOrders = await RepairOrder.aggregate([
      {
        $match: {
          merchantId: 'Mobile123',
          soldDate: { $gte: today, $lt: tomorrow },
          status: 'sold'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$salePrice' }
        }
      }
    ]);
    
    const dailyRepairsFromQuickSales = await MerchantSale.aggregate([
      {
        $match: {
          merchantId: 'Mobile123',
          saleDate: { $gte: today, $lt: tomorrow },
          status: 'completed',
          'items.isQuickSale': true,
          'items.quickSaleCategory': 'services'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.isQuickSale': true,
          'items.quickSaleCategory': 'services'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]);
    
    const aggregateTotal = 
      (dailyRepairsFromOrders.length > 0 ? dailyRepairsFromOrders[0].total : 0) +
      (dailyRepairsFromQuickSales.length > 0 ? dailyRepairsFromQuickSales[0].total : 0);
    
    console.log(`✅ 聚合查询结果: €${aggregateTotal.toFixed(2)}`);
    console.log(`   维修订单: €${dailyRepairsFromOrders.length > 0 ? dailyRepairsFromOrders[0].total.toFixed(2) : '0.00'}`);
    console.log(`   快速销售Service: €${dailyRepairsFromQuickSales.length > 0 ? dailyRepairsFromQuickSales[0].total.toFixed(2) : '0.00'}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testStats();
