const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone15Plus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const SalesInvoice = require('./models/SalesInvoice');
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    // 查找所有 iPhone 15 Plus
    const products = await ProductNew.find({
      name: /iPhone 15 Plus/i,
      isActive: true
    });
    
    console.log(`📱 找到 ${products.length} 个 iPhone 15 Plus 产品\n`);
    
    for (const product of products) {
      console.log(`\n产品: ${product.name}`);
      console.log(`  _id: ${product._id}`);
      console.log(`  颜色: ${product.color}`);
      console.log(`  成色: ${product.condition}`);
      console.log(`  库存数量: ${product.stockQuantity}`);
      console.log(`  序列号数量: ${product.serialNumbers?.length || 0}`);
      
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        console.log(`  序列号详情:`);
        for (const sn of product.serialNumbers) {
          console.log(`    - ${sn.serialNumber}:`);
          console.log(`        状态: ${sn.status}`);
          
          if (sn.status === 'sold') {
            console.log(`        销售发票: ${sn.salesInvoice}`);
            console.log(`        销售日期: ${sn.soldDate}`);
          }
          
          if (sn.status === 'transferred') {
            console.log(`        调货订单: ${sn.warehouseOrder}`);
            console.log(`        调货日期: ${sn.transferredDate}`);
          }
        }
      } else {
        console.log(`  ⚠️  没有序列号！这是配件类型的产品吗？`);
        console.log(`  产品类型: ${product.category?.type}`);
        console.log(`  品牌: ${product.brand}`);
        console.log(`  型号: ${product.model}`);
      }
      
      // 检查是否有仓库订单
      const warehouseOrders = await WarehouseOrder.find({
        'items.productId': product._id
      });
      
      if (warehouseOrders.length > 0) {
        console.log(`  📦 仓库订单: ${warehouseOrders.length} 个`);
        warehouseOrders.forEach(order => {
          console.log(`    - ${order.orderNumber} (${order.status})`);
          const item = order.items.find(i => i.productId.toString() === product._id.toString());
          if (item) {
            console.log(`      订购数量: ${item.quantity}`);
            console.log(`      序列号: ${item.serialNumbers?.join(', ') || 'N/A'}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIPhone15Plus();
