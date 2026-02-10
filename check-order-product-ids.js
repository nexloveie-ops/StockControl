/**
 * 检查订单中的 productId
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrderProductIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查找订单
    const order = await WarehouseOrder.findOne({
      orderNumber: 'WO-20260210-3898'
    }).lean();
    
    if (!order) {
      console.log('❌ 未找到订单');
      return;
    }
    
    console.log('=== 检查订单商品的 productId ===\n');
    
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      console.log(`商品 ${i + 1}: ${item.productName}`);
      console.log(`  productId: ${item.productId || '❌ 未设置'}`);
      
      if (item.productId) {
        // 尝试查找产品
        const product = await AdminInventory.findById(item.productId).lean();
        
        if (product) {
          console.log(`  ✅ 在 AdminInventory 中找到`);
          console.log(`     产品名称: ${product.productName}`);
          console.log(`     数量: ${product.quantity}`);
          console.log(`     成色: ${product.condition}`);
          console.log(`     分类: ${product.category}`);
        } else {
          console.log(`  ❌ 在数据库中未找到此 productId`);
        }
      } else {
        console.log(`  ❌ 缺少 productId，无法验证库存`);
      }
      
      console.log('');
    }
    
    console.log('=== 问题总结 ===');
    const missingProductId = order.items.filter(item => !item.productId);
    
    if (missingProductId.length > 0) {
      console.log(`❌ ${missingProductId.length} 个商品缺少 productId`);
      console.log('这会导致确认订单时无法验证库存，返回 HTTP 400 错误');
      console.log('');
      console.log('解决方案：');
      console.log('1. 删除此订单，重新创建');
      console.log('2. 或者手动修复订单数据，添加正确的 productId');
    } else {
      console.log('✅ 所有商品都有 productId');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkOrderProductIds();
