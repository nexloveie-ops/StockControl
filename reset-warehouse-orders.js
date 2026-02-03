require('dotenv').config();
const mongoose = require('mongoose');

async function resetWarehouseOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 删除所有仓库订单
    console.log('🗑️  删除仓库订单...');
    const deleteOrderResult = await WarehouseOrder.deleteMany({});
    console.log(`   删除了 ${deleteOrderResult.deletedCount} 个订单\n`);
    
    // 2. 删除从仓库订货创建的商户库存
    console.log('🗑️  删除商户库存（来源：仓库）...');
    const deleteInventoryResult = await MerchantInventory.deleteMany({ source: 'warehouse' });
    console.log(`   删除了 ${deleteInventoryResult.deletedCount} 个库存记录\n`);
    
    // 3. 恢复 galaxy A53 产品状态
    console.log('🔄 恢复 galaxy A53 产品状态...');
    const product = await ProductNew.findOne({ name: /galaxy A53/i });
    
    if (product) {
      console.log(`   产品: ${product.name}`);
      console.log(`   当前 stockQuantity: ${product.stockQuantity}`);
      console.log(`   序列号总数: ${product.serialNumbers.length}`);
      
      // 将所有序列号状态恢复为 available
      let restoredCount = 0;
      product.serialNumbers.forEach(sn => {
        if (sn.status === 'sold') {
          sn.status = 'available';
          sn.soldTo = null;
          sn.soldAt = null;
          restoredCount++;
        }
      });
      
      console.log(`   恢复了 ${restoredCount} 个序列号为可用状态`);
      
      // 更新 stockQuantity
      const availableCount = product.serialNumbers.filter(sn => sn.status === 'available').length;
      product.stockQuantity = availableCount;
      product.isActive = true;
      
      await product.save();
      
      console.log(`   ✅ 更新 stockQuantity: ${product.stockQuantity}`);
      console.log(`   ✅ isActive: ${product.isActive}`);
      
      // 显示序列号状态
      console.log('\n   序列号状态:');
      product.serialNumbers.forEach(sn => {
        console.log(`   - ${sn.serialNumber}: ${sn.status}`);
      });
    } else {
      console.log('   ⚠️ 未找到 galaxy A53 产品');
    }
    
    console.log('\n✅ 重置完成！');
    
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

resetWarehouseOrders();
