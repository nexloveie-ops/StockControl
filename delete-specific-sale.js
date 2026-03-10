const mongoose = require('mongoose');
require('dotenv').config();

async function deleteSpecificSale() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查找15:27的记录
    const targetTime = new Date();
    targetTime.setHours(15, 27, 0, 0);
    const targetTimeEnd = new Date();
    targetTimeEnd.setHours(15, 28, 0, 0);
    
    console.log(`🔍 查找 15:27 的销售记录...\n`);
    
    const sales = await MerchantSale.find({
      merchantId: 'Mobile123',
      saleDate: { 
        $gte: targetTime,
        $lt: targetTimeEnd
      }
    });
    
    console.log(`找到 ${sales.length} 条记录\n`);
    
    if (sales.length === 0) {
      console.log('没有找到15:27的记录');
      return;
    }
    
    // 显示找到的记录
    sales.forEach((sale, index) => {
      console.log(`${index + 1}. 订单 ${sale._id}`);
      console.log(`   时间: ${sale.saleDate.toLocaleString('zh-CN')}`);
      console.log(`   金额: €${sale.totalAmount}`);
      console.log(`   状态: ${sale.status}`);
      console.log(`   产品:`);
      sale.items.forEach((item, i) => {
        console.log(`     ${i + 1}. ${item.productName} - €${item.price} x ${item.quantity}`);
      });
      console.log('');
    });
    
    // 查找包含"iPhone Clear Case (iPhone 15 - Black)"的记录
    const saleToDelete = sales.find(sale => 
      sale.items.some(item => item.productName.includes('iPhone Clear Case') && item.productName.includes('iPhone 15 - Black'))
    );
    
    if (!saleToDelete) {
      console.log('❌ 没有找到包含"iPhone Clear Case (iPhone 15 - Black)"的记录');
      return;
    }
    
    console.log(`\n🗑️  准备删除订单: ${saleToDelete._id}`);
    console.log(`   时间: ${saleToDelete.saleDate.toLocaleString('zh-CN')}`);
    console.log(`   金额: €${saleToDelete.totalAmount}\n`);
    
    // 删除记录
    await MerchantSale.deleteOne({ _id: saleToDelete._id });
    
    console.log('✅ 已删除该销售记录');
    
    // 验证删除结果
    const remainingSales = await MerchantSale.find({
      merchantId: 'Mobile123'
    }).sort({ saleDate: -1 });
    
    console.log(`\n📊 剩余销售记录: ${remainingSales.length} 条`);
    
    if (remainingSales.length > 0) {
      console.log('\n剩余记录:');
      remainingSales.forEach((sale, index) => {
        console.log(`${index + 1}. ${sale.saleDate.toLocaleString('zh-CN')} - €${sale.totalAmount}`);
        sale.items.forEach((item, i) => {
          console.log(`   - ${item.productName}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

deleteSpecificSale();
