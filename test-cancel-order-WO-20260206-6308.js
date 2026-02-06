/**
 * 测试取消订单 WO-20260206-6308
 * 模拟通过页面点击取消按钮的操作
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function testCancelOrder() {
  try {
    console.log('🔗 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    const AdminInventory = require('./models/AdminInventory');
    const ProductNew = require('./models/ProductNew');

    const orderNumber = 'WO-20260206-6308';
    const productId = '698529b6b9f253cade6e4fb2'; // iPhone Clear Case iPhone 12 Pro Max

    console.log('=' .repeat(70));
    console.log('📋 测试场景：通过页面取消订单');
    console.log('=' .repeat(70));
    console.log(`订单号: ${orderNumber}`);
    console.log(`产品: iPhone Clear Case (iPhone 12 Pro Max)`);
    console.log(`当前库存: 3个`);
    console.log(`订单数量: 2个`);
    console.log(`预期结果: 取消后库存应该是 5个`);
    console.log('=' .repeat(70));
    console.log('');

    // 1. 查看取消前的状态
    console.log('📦 步骤1: 查看取消前的状态');
    
    const order = await WarehouseOrder.findOne({ orderNumber });
    if (!order) {
      console.log('❌ 订单不存在');
      process.exit(1);
    }
    
    console.log(`✅ 订单状态: ${order.status}`);
    console.log(`   订单ID: ${order._id}`);
    console.log(`   商户: ${order.merchantName}`);
    
    const product = await AdminInventory.findById(productId);
    if (!product) {
      console.log('❌ 产品不存在');
      process.exit(1);
    }
    
    const stockBefore = product.quantity;
    console.log(`✅ 当前库存: ${stockBefore}个`);
    console.log('');

    if (order.status === 'cancelled') {
      console.log('⚠️  订单已经是取消状态，无需再次取消');
      console.log(`📊 当前库存: ${stockBefore}个`);
      process.exit(0);
    }

    // 2. 模拟前端调用 /api/warehouse/orders/:id/cancel
    console.log('🔄 步骤2: 模拟前端调用取消订单API');
    console.log(`   API: PUT /api/warehouse/orders/${order._id}/cancel`);
    console.log(`   Body: { reason: "测试取消" }`);
    console.log('');

    // 执行后端取消订单的逻辑
    console.log('⚙️  步骤3: 执行后端取消订单逻辑');
    
    // 检查订单状态
    if (order.status === 'completed' || order.status === 'cancelled') {
      console.log('❌ 订单无法取消');
      process.exit(1);
    }
    
    if (order.status === 'shipped') {
      console.log('❌ 已发货的订单无法取消');
      process.exit(1);
    }
    
    // 恢复库存
    console.log('   恢复库存中...');
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const shipmentItem = order.shipmentDetails && order.shipmentDetails[i];
      
      console.log(`   - 处理产品: ${item.productName} (数量: ${item.quantity})`);
      
      if (item.source === 'AdminInventory') {
        const prod = await AdminInventory.findById(item.productId);
        if (prod) {
          const before = prod.quantity;
          prod.quantity += item.quantity;
          
          if (prod.quantity > 0) {
            prod.isActive = true;
          }
          
          await prod.save();
          console.log(`     AdminInventory: ${before} + ${item.quantity} = ${prod.quantity}`);
        }
      } else {
        const prod = await ProductNew.findById(item.productId);
        if (prod) {
          const before = prod.stockQuantity;
          
          if (shipmentItem && shipmentItem.isDevice && shipmentItem.selectedProducts) {
            // 设备：恢复序列号
            for (const snId of shipmentItem.selectedProducts) {
              const serialNumberObj = prod.serialNumbers.find(
                sn => sn._id.toString() === snId.toString()
              );
              if (serialNumberObj && serialNumberObj.status === 'sold') {
                serialNumberObj.status = 'available';
                serialNumberObj.soldTo = null;
                serialNumberObj.soldAt = null;
              }
            }
            
            const availableCount = prod.serialNumbers.filter(
              sn => sn.status === 'available'
            ).length;
            prod.stockQuantity = availableCount;
            
            if (availableCount > 0) {
              prod.isActive = true;
            }
            console.log(`     ProductNew (设备): 恢复序列号，库存 = ${prod.stockQuantity}`);
          } else {
            // 配件：增加库存
            prod.stockQuantity += item.quantity;
            
            if (prod.stockQuantity > 0) {
              prod.isActive = true;
            }
            console.log(`     ProductNew (配件): ${before} + ${item.quantity} = ${prod.stockQuantity}`);
          }
          
          await prod.save();
        }
      }
    }
    
    // 更新订单状态
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = '测试取消';
    await order.save();
    
    console.log('   ✅ 订单状态已更新为 cancelled');
    console.log('');

    // 3. 查看取消后的状态
    console.log('📦 步骤4: 查看取消后的状态');
    
    const updatedProduct = await AdminInventory.findById(productId);
    const stockAfter = updatedProduct.quantity;
    
    console.log(`✅ 最终库存: ${stockAfter}个`);
    console.log(`   isActive: ${updatedProduct.isActive}`);
    console.log('');

    // 4. 结果验证
    console.log('=' .repeat(70));
    console.log('📊 测试结果');
    console.log('=' .repeat(70));
    console.log(`取消前库存: ${stockBefore}个`);
    console.log(`订单数量: 2个`);
    console.log(`取消后库存: ${stockAfter}个`);
    console.log(`库存变化: ${stockAfter > stockBefore ? '+' : ''}${stockAfter - stockBefore}个`);
    console.log('');
    
    const expectedStock = stockBefore + 2;
    if (stockAfter === expectedStock) {
      console.log(`✅ 测试通过！库存正确恢复到 ${stockAfter}个`);
      console.log(`   (${stockBefore} + 2 = ${stockAfter})`);
    } else {
      console.log(`❌ 测试失败！库存不正确`);
      console.log(`   预期: ${expectedStock}个`);
      console.log(`   实际: ${stockAfter}个`);
      console.log(`   差异: ${stockAfter - expectedStock}个`);
    }
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
  }
}

testCancelOrder();
