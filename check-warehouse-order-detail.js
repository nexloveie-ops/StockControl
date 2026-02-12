require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const CompanyInfo = require('./models/CompanyInfo');
    
    // 查询一个仓库订单
    const order = await WarehouseOrder.findOne({ orderNumber: 'WO-20260212-2243' }).lean();
    
    if (order) {
      console.log('📦 仓库订单详情:');
      console.log('订单号:', order.orderNumber);
      console.log('商户ID:', order.merchantId);
      console.log('状态:', order.status);
      console.log('订单日期:', order.orderDate);
      console.log('\n产品列表:');
      
      let totalAmount = 0;
      let taxAmount = 0;
      
      order.items.forEach((item, index) => {
        console.log(`\n产品 ${index + 1}:`);
        console.log('  名称:', item.name || item.productName);
        console.log('  数量:', item.quantity);
        console.log('  costPrice:', item.costPrice);
        console.log('  price:', item.price);
        console.log('  税分类:', item.taxClassification);
        
        const itemTotal = (item.costPrice || item.price || 0) * item.quantity;
        totalAmount += itemTotal;
        
        console.log('  小计:', itemTotal);
        
        // 计算税额
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          const tax = itemTotal - (itemTotal / 1.23);
          taxAmount += tax;
          console.log('  税额 (VAT 23%):', tax);
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          const tax = itemTotal - (itemTotal / 1.135);
          taxAmount += tax;
          console.log('  税额 (VAT 13.5%):', tax);
        } else {
          console.log('  税额:', 0);
        }
      });
      
      console.log('\n订单总计:');
      console.log('总金额:', totalAmount.toFixed(2));
      console.log('税额:', taxAmount.toFixed(2));
    } else {
      console.log('❌ 未找到订单');
    }
    
    // 查询默认公司信息
    console.log('\n\n📋 仓库公司信息:');
    const companyInfo = await CompanyInfo.findOne({ isDefault: true }).lean();
    if (companyInfo) {
      console.log('公司名称:', companyInfo.companyName);
      console.log('税号:', companyInfo.taxNumber);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkWarehouseOrder();
