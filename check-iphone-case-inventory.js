require('dotenv').config();
const mongoose = require('mongoose');

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询商户库存中的 iPhone Clear Case
    console.log('\n📦 查询商户库存 (MerchantInventory)...');
    const merchantItems = await MerchantInventory.find({
      productName: /iPhone Clear Case/i
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${merchantItems.length} 个商户库存记录：`);
    merchantItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   品牌: ${item.brand || '无'}`);
      console.log(`   型号: ${item.model || '无'}`);
      console.log(`   颜色: ${item.color || '无'}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   价格: €${item.retailPrice}`);
      console.log(`   商户: ${item.merchantId || '无'}`);
      console.log(`   创建时间: ${item.createdAt}`);
    });
    
    // 查询管理员库存中的 iPhone Clear Case
    console.log('\n\n📦 查询管理员库存 (AdminInventory)...');
    const adminItems = await AdminInventory.find({
      productName: /iPhone Clear Case/i
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${adminItems.length} 个管理员库存记录：`);
    adminItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   品牌: ${item.brand || '无'}`);
      console.log(`   型号: ${item.model || '无'}`);
      console.log(`   颜色: ${item.color || '无'}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   价格: €${item.retailPrice}`);
      console.log(`   状态: ${item.status}`);
      console.log(`   创建时间: ${item.createdAt}`);
    });
    
    console.log('\n\n📊 总结：');
    console.log(`商户库存: ${merchantItems.length} 个`);
    console.log(`管理员库存: ${adminItems.length} 个`);
    console.log(`总计: ${merchantItems.length + adminItems.length} 个`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkInventory();
