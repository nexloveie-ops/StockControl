require('dotenv').config();
const mongoose = require('mongoose');

async function checkOrderMerchantInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const UserNew = require('./models/UserNew');
    
    // 查询订单
    const order = await WarehouseOrder.findOne({ orderNumber: 'WO-20260212-2243' }).lean();
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📦 订单信息:');
    console.log('   订单号:', order.orderNumber);
    console.log('   商户ID:', order.merchantId);
    console.log('   商户名称:', order.merchantName);
    console.log('   商户公司信息:', order.merchantCompanyInfo);
    
    // 查询商户用户信息
    const merchant = await UserNew.findOne({ username: order.merchantId });
    
    if (!merchant) {
      console.log('\n❌ 商户用户不存在');
      return;
    }
    
    console.log('\n👤 商户用户信息:');
    console.log('   用户名:', merchant.username);
    console.log('   角色:', merchant.role);
    console.log('   公司信息:', merchant.companyInfo);
    
    if (merchant.companyInfo) {
      console.log('\n🏢 商户公司详情:');
      console.log('   公司名称:', merchant.companyInfo.companyName);
      console.log('   注册号:', merchant.companyInfo.registrationNumber);
      console.log('   VAT号:', merchant.companyInfo.vatNumber);
      console.log('   地址:', merchant.companyInfo.address);
    } else {
      console.log('\n❌ 商户没有公司信息字段');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkOrderMerchantInfo();
