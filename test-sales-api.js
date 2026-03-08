const mongoose = require('mongoose');
require('dotenv').config();

async function testSalesAPI() {
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
    
    // 模拟API查询
    const sales = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    }).sort({ saleDate: -1 });
    
    console.log(`📊 找到 ${sales.length} 条completed状态的销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`\n=== 记录 ${index + 1} ===`);
      console.log(`订单ID: ${sale._id}`);
      console.log(`销售时间: ${sale.saleDate.toLocaleTimeString('zh-CN')}`);
      console.log(`订单状态: ${sale.status}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log(`退款金额: €${sale.refundAmount || 0}`);
      
      console.log(`\n产品列表 (${sale.items.length}):`);
      sale.items.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.productName}`);
        console.log(`     价格: €${item.price} x ${item.quantity}`);
        console.log(`     序列号: ${item.serialNumber || 'N/A'}`);
        console.log(`     库存ID: ${item.inventoryId || 'N/A'}`);
      });
      
      if (sale.refundItems && sale.refundItems.length > 0) {
        console.log(`\n🔄 退款项目 (${sale.refundItems.length}):`);
        sale.refundItems.forEach((refundItem, i) => {
          console.log(`  ${i + 1}. ${refundItem.productName}`);
          console.log(`     序列号: ${refundItem.serialNumber || 'N/A'}`);
          console.log(`     产品ID: ${refundItem.productId || 'N/A'}`);
          console.log(`     类型: ${refundItem.type || 'N/A'}`);
        });
        
        // 测试过滤逻辑
        console.log(`\n✅ 应该显示的产品（未退款）:`);
        const activeItems = sale.items.filter(item => {
          const isRefunded = sale.refundItems.some(refundItem => {
            if (item.serialNumber && refundItem.serialNumber) {
              return item.serialNumber === refundItem.serialNumber;
            }
            if (item.inventoryId && refundItem.productId) {
              return item.inventoryId.toString() === refundItem.productId.toString();
            }
            return item.productName === refundItem.productName;
          });
          return !isRefunded;
        });
        
        activeItems.forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.productName} - €${item.price * item.quantity}`);
        });
        
        if (activeItems.length === 0) {
          console.log(`  (无 - 所有产品都已退款)`);
        }
      } else {
        console.log(`\n✅ 无退款，显示所有产品`);
      }
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testSalesAPI();
