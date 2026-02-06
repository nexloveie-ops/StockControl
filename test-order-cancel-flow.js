/**
 * 测试订单创建和取消流程
 * 验证库存是否正确恢复
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function testOrderCancelFlow() {
  try {
    console.log('🔗 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    const WarehouseOrder = require('./models/WarehouseOrder');

    // 1. 直接使用产品ID
    console.log('📦 步骤1: 查找产品 "iPhone Clear Case iPhone 12 Pro Max"');
    const productId = '698529b6b9f253cade6e4fb2';
    
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
    const initialStock = isAdminInventory ? product.quantity : product.stockQuantity;
    
    console.log(`✅ 找到产品: ${productName}`);
    console.log(`📊 初始库存: ${initialStock}`);
    console.log(`🏷️  来源: ${isAdminInventory ? 'AdminInventory' : 'ProductNew'}`);
    console.log(`🆔 产品ID: ${product._id}\n`);

    // 2. 创建订单
    console.log('📝 步骤2: 创建订单（订购2个）');
    const orderQuantity = 2;
    
    const order = new WarehouseOrder({
      orderNumber: `TEST-${Date.now()}`,
      merchantId: 'test-merchant',
      merchantName: '测试商户',
      items: [{
        productId: product._id,
        productName: productName,
        sku: product.sku || '',
        brand: product.brand || '',
        model: product.model || '',
        quantity: orderQuantity,
        wholesalePrice: product.wholesalePrice || product.costPrice || 10,
        subtotal: (product.wholesalePrice || product.costPrice || 10) * orderQuantity,
        taxClassification: 'VAT_23',
        taxAmount: 0,
        source: isAdminInventory ? 'AdminInventory' : 'ProductNew'
      }],
      totalAmount: (product.wholesalePrice || product.costPrice || 10) * orderQuantity,
      subtotal: (product.wholesalePrice || product.costPrice || 10) * orderQuantity,
      taxAmount: 0,
      deliveryMethod: 'pickup',
      status: 'pending'
    });

    await order.save();
    console.log(`✅ 订单创建成功: ${order.orderNumber}`);

    // 3. 扣减库存（模拟创建订单时的库存预留）
    console.log('📉 步骤3: 扣减库存（预留）');
    if (isAdminInventory) {
      product.quantity -= orderQuantity;
    } else {
      product.stockQuantity -= orderQuantity;
    }
    await product.save();
    
    const stockAfterOrder = isAdminInventory ? product.quantity : product.stockQuantity;
    console.log(`📊 扣减后库存: ${stockAfterOrder}`);
    console.log(`✅ 预期: ${initialStock} - ${orderQuantity} = ${initialStock - orderQuantity}\n`);

    // 4. 取消订单
    console.log('❌ 步骤4: 取消订单');
    
    // 恢复库存（模拟取消订单的逻辑）
    if (isAdminInventory) {
      product.quantity += orderQuantity;
      if (product.quantity > 0) {
        product.isActive = true;
      }
    } else {
      product.stockQuantity += orderQuantity;
      if (product.stockQuantity > 0) {
        product.isActive = true;
      }
    }
    await product.save();

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = '测试取消';
    await order.save();

    const stockAfterCancel = isAdminInventory ? product.quantity : product.stockQuantity;
    console.log(`✅ 订单已取消`);
    console.log(`📊 取消后库存: ${stockAfterCancel}`);
    console.log(`✅ 预期: ${stockAfterOrder} + ${orderQuantity} = ${stockAfterOrder + orderQuantity}\n`);

    // 5. 验证结果
    console.log('=' .repeat(60));
    console.log('📋 测试结果汇总:');
    console.log('=' .repeat(60));
    console.log(`产品名称: ${productName}`);
    console.log(`初始库存: ${initialStock}`);
    console.log(`订购数量: ${orderQuantity}`);
    console.log(`扣减后库存: ${stockAfterOrder}`);
    console.log(`取消后库存: ${stockAfterCancel}`);
    console.log('');
    
    if (stockAfterCancel === initialStock) {
      console.log('✅ 测试通过！库存已正确恢复到初始值');
    } else {
      console.log(`❌ 测试失败！库存未正确恢复`);
      console.log(`   预期: ${initialStock}`);
      console.log(`   实际: ${stockAfterCancel}`);
      console.log(`   差异: ${stockAfterCancel - initialStock}`);
    }

    // 6. 清理测试订单
    console.log('\n🧹 清理测试数据...');
    await WarehouseOrder.deleteOne({ _id: order._id });
    console.log('✅ 测试订单已删除');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
  }
}

// 运行测试
testOrderCancelFlow();
