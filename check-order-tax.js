// 检查订单税务分类
const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrderTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const MerchantInventory = require('./models/MerchantInventory');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    const orderId = '699527ba3590cc3a220b85b9';
    
    console.log('=== 检查订单税务分类 ===\n');
    console.log(`订单ID: ${orderId}\n`);
    
    // 1. 查询订单
    const order = await WarehouseOrder.findById(orderId);
    
    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📋 订单信息:');
    console.log(`  订单号: ${order.orderNumber}`);
    console.log(`  状态: ${order.status}`);
    console.log(`  商户: ${order.merchantName}`);
    console.log(`  产品数量: ${order.items.length}\n`);
    
    // 2. 检查订单中的每个产品
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      console.log(`\n--- 产品 ${i + 1}: ${item.productName} ---`);
      console.log(`  订单中的税务分类: ${item.taxClassification}`);
      console.log(`  产品ID: ${item.productId}`);
      
      // 3. 查找原始产品（ProductNew）
      const productNew = await ProductNew.findById(item.productId);
      if (productNew) {
        console.log(`\n  ✅ 在 ProductNew 中找到:`);
        console.log(`     vatRate: ${productNew.vatRate}`);
        console.log(`     condition: ${productNew.condition}`);
      }
      
      // 4. 查找 AdminInventory
      const adminInv = await AdminInventory.findById(item.productId);
      if (adminInv) {
        console.log(`\n  ✅ 在 AdminInventory 中找到:`);
        console.log(`     taxClassification: ${adminInv.taxClassification}`);
        console.log(`     condition: ${adminInv.condition}`);
      }
      
      // 5. 查找商户库存
      const merchantInv = await MerchantInventory.find({
        warehouseOrderId: orderId,
        productName: item.productName
      });
      
      if (merchantInv.length > 0) {
        console.log(`\n  ✅ 在 MerchantInventory 中找到 ${merchantInv.length} 条记录:`);
        merchantInv.forEach((inv, idx) => {
          console.log(`     ${idx + 1}. taxClassification: ${inv.taxClassification}`);
          console.log(`        vatRate: ${inv.vatRate}`);
        });
      }
    }
    
    console.log('\n\n=== 分析 ===');
    console.log('问题: 原始产品是 Margin VAT，但订单/商户库存变成了 VAT 23%');
    console.log('需要检查: 订单创建时的税务分类转换逻辑');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrderTax();
