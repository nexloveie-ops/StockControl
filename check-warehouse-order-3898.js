/**
 * 检查仓库订单 WO-20260210-3898 的详细信息
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找订单
    const order = await WarehouseOrder.findOne({
      orderNumber: 'WO-20260210-3898'
    }).lean();
    
    if (!order) {
      console.log('❌ 未找到订单 WO-20260210-3898');
      return;
    }
    
    console.log('=== 订单基本信息 ===');
    console.log(`订单号: ${order.orderNumber}`);
    console.log(`状态: ${order.status}`);
    console.log(`仓库: ${order.warehouseId}`);
    console.log(`商户: ${order.merchantId}`);
    console.log(`创建时间: ${new Date(order.createdAt).toLocaleString('zh-CN')}`);
    console.log(`总金额: €${order.totalAmount || 0}`);
    console.log('');
    
    console.log('=== 订单商品 ===');
    console.log(`商品数量: ${order.items.length}`);
    console.log('');
    
    order.items.forEach((item, index) => {
      console.log(`商品 ${index + 1}:`);
      console.log(`  产品名称: ${item.productName}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  单价: €${item.unitPrice || 0}`);
      console.log(`  总价: €${item.totalPrice || 0}`);
      console.log(`  税率: ${item.vatRate || '未设置'}`);
      console.log(`  税额: €${item.taxAmount || 0}`);
      console.log(`  成色: ${item.condition || '未设置'}`);
      console.log(`  分类: ${item.category || '未设置'}`);
      console.log(`  序列号: ${item.serialNumbers?.length || 0} 个`);
      
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        console.log(`  序列号列表:`);
        item.serialNumbers.forEach((sn, i) => {
          if (typeof sn === 'object') {
            console.log(`    ${i + 1}. ${sn.serialNumber} (颜色: ${sn.color || '未设置'})`);
          } else {
            console.log(`    ${i + 1}. ${sn}`);
          }
        });
      }
      
      console.log('');
    });
    
    // 检查数据完整性
    console.log('=== 数据验证 ===');
    let hasErrors = false;
    
    order.items.forEach((item, index) => {
      const errors = [];
      
      if (!item.productName) errors.push('缺少产品名称');
      if (!item.quantity || item.quantity <= 0) errors.push('数量无效');
      if (item.unitPrice === undefined || item.unitPrice === null) errors.push('缺少单价');
      if (!item.category) errors.push('缺少分类');
      if (!item.condition) errors.push('缺少成色');
      
      // 检查设备产品的序列号
      const isDevice = item.category && (
        item.category.toLowerCase().includes('device') ||
        item.category.toLowerCase().includes('设备') ||
        item.category.toLowerCase().includes('phone') ||
        item.category.toLowerCase().includes('手机')
      );
      
      if (isDevice && (!item.serialNumbers || item.serialNumbers.length !== item.quantity)) {
        errors.push(`设备产品需要 ${item.quantity} 个序列号，但只有 ${item.serialNumbers?.length || 0} 个`);
      }
      
      if (errors.length > 0) {
        hasErrors = true;
        console.log(`❌ 商品 ${index + 1} (${item.productName}):`);
        errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log(`✅ 商品 ${index + 1} (${item.productName}): 数据完整`);
      }
    });
    
    if (!hasErrors) {
      console.log('\n✅ 所有商品数据完整，应该可以确认订单');
    } else {
      console.log('\n⚠️ 发现数据问题，可能导致确认失败');
    }
    
    // 检查订单状态
    console.log('\n=== 订单状态检查 ===');
    if (order.status === 'pending') {
      console.log('✅ 订单状态为 pending，可以确认');
    } else {
      console.log(`⚠️ 订单状态为 ${order.status}，可能无法确认`);
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkWarehouseOrder();
