/**
 * 取消真实订单并检查库存变化
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function cancelRealOrder() {
  try {
    console.log('🔗 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    const AdminInventory = require('./models/AdminInventory');
    const ProductNew = require('./models/ProductNew');

    const orderNumber = 'WO-20260206-6906';
    const productId = '698529b6b9f253cade6e4fb2'; // iPhone Clear Case iPhone 12 Pro Max

    // 1. 查找订单
    console.log(`📋 步骤1: 查找订单 ${orderNumber}`);
    const order = await WarehouseOrder.findOne({ orderNumber });
    
    if (!order) {
      console.log('❌ 订单不存在');
      process.exit(1);
    }
    
    console.log(`✅ 找到订单: ${order.orderNumber}`);
    console.log(`   状态: ${order.status}`);
    console.log(`   商户: ${order.merchantName}`);
    console.log(`   订单项数量: ${order.items.length}`);
    console.log('');

    // 2. 查看当前库存
    console.log('📦 步骤2: 查看当前库存');
    let product = await AdminInventory.findById(productId);
    let isAdminInventory = true;
    
    if (!product) {
      product = await ProductNew.findById(productId);
      isAdminInventory = false;
    }
    
    if (!product) {
      console.log('❌ 产品不存在');
      process.exit(1);
    }
    
    const productName = isAdminInventory ? product.productName : product.name;
    const currentStock = isAdminInventory ? product.quantity : product.stockQuantity;
    
    console.log(`✅ 产品: ${productName} (${product.model})`);
    console.log(`📊 当前库存: ${currentStock}`);
    console.log(`🏷️  来源: ${isAdminInventory ? 'AdminInventory' : 'ProductNew'}`);
    console.log('');

    // 3. 显示订单详情
    console.log('📝 步骤3: 订单详情');
    order.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.productName}`);
      console.log(`      数量: ${item.quantity}`);
      console.log(`      产品ID: ${item.productId}`);
      console.log(`      来源: ${item.source || 'ProductNew'}`);
    });
    console.log('');

    // 4. 检查订单状态
    if (order.status === 'cancelled') {
      console.log('⚠️  订单已经是取消状态');
      process.exit(0);
    }

    if (order.status === 'completed') {
      console.log('❌ 订单已完成，无法取消');
      process.exit(1);
    }

    // 5. 取消订单并恢复库存
    console.log('❌ 步骤4: 取消订单并恢复库存');
    
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const shipmentItem = order.shipmentDetails && order.shipmentDetails[i];
      
      console.log(`   处理: ${item.productName} (数量: ${item.quantity})`);
      
      if (item.source === 'AdminInventory') {
        const prod = await AdminInventory.findById(item.productId);
        if (prod) {
          const beforeStock = prod.quantity;
          prod.quantity += item.quantity;
          
          if (prod.quantity > 0) {
            prod.isActive = true;
          }
          
          await prod.save();
          console.log(`      AdminInventory: ${beforeStock} + ${item.quantity} = ${prod.quantity}`);
        }
      } else {
        const prod = await ProductNew.findById(item.productId);
        if (prod) {
          const beforeStock = prod.stockQuantity;
          
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
            console.log(`      ProductNew (设备): 恢复序列号，库存 = ${prod.stockQuantity}`);
          } else {
            // 配件：增加库存
            prod.stockQuantity += item.quantity;
            
            if (prod.stockQuantity > 0) {
              prod.isActive = true;
            }
            console.log(`      ProductNew (配件): ${beforeStock} + ${item.quantity} = ${prod.stockQuantity}`);
          }
          
          await prod.save();
        }
      }
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = '仓管员手动取消';
    await order.save();
    
    console.log('✅ 订单已取消\n');

    // 6. 查看取消后的库存
    console.log('📦 步骤5: 查看取消后的库存');
    const updatedProduct = isAdminInventory 
      ? await AdminInventory.findById(productId)
      : await ProductNew.findById(productId);
    
    const finalStock = isAdminInventory ? updatedProduct.quantity : updatedProduct.stockQuantity;
    
    console.log(`✅ 产品: ${productName} (${updatedProduct.model})`);
    console.log(`📊 最终库存: ${finalStock}`);
    console.log('');

    // 7. 结果汇总
    console.log('=' .repeat(60));
    console.log('📋 操作结果汇总:');
    console.log('=' .repeat(60));
    console.log(`订单号: ${orderNumber}`);
    console.log(`产品: ${productName} (${product.model})`);
    console.log(`取消前库存: ${currentStock}`);
    console.log(`取消后库存: ${finalStock}`);
    console.log(`库存变化: ${finalStock > currentStock ? '+' : ''}${finalStock - currentStock}`);
    console.log('');
    
    if (finalStock > currentStock) {
      console.log(`✅ 库存已恢复！增加了 ${finalStock - currentStock} 个`);
    } else if (finalStock === currentStock) {
      console.log('⚠️  库存未变化');
    } else {
      console.log('❌ 库存减少了，这不正常！');
    }

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
  }
}

cancelRealOrder();
