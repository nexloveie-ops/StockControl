require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouseOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');

    const orders = await WarehouseOrder.find().sort({ createdAt: -1 }).limit(5).lean();

    console.log(`找到 ${orders.length} 个仓库订单\n`);

    if (orders.length === 0) {
      console.log('❌ 数据库中没有仓库订单');
      console.log('\n提示: 仓库订单发货IMEI/SN选择功能已经完整实现！');
      console.log('\n功能说明:');
      console.log('1. 当仓库管理员点击"🚚 标记发货"时');
      console.log('2. 系统会检查每个产品是否为设备（有IMEI/SN）');
      console.log('3. 对于设备产品：显示IMEI/SN列表，管理员需要选择具体的设备');
      console.log('4. 对于配件产品：显示数量输入框');
      console.log('5. 选择完成后点击"✅ 确认发货"即可');
      console.log('\n代码位置:');
      console.log('- 前端: prototype-working.html 第7912-8146行');
      console.log('- 后端: app.js 第1972行（获取可用产品）和第2687行（发货API）');
    } else {
      orders.forEach((order, index) => {
        console.log(`订单 ${index + 1}:`);
        console.log(`  订单号: ${order.orderNumber}`);
        console.log(`  商户: ${order.merchantId}`);
        console.log(`  状态: ${order.status}`);
        console.log(`  产品数量: ${order.items?.length || 0}`);
        console.log(`  创建时间: ${order.createdAt}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

checkWarehouseOrders();
