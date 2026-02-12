// 删除所有调货订单并恢复库存
require('dotenv').config();
const mongoose = require('mongoose');

async function resetTransferOrders() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    const InventoryTransfer = require('./models/InventoryTransfer');
    const MerchantInventory = require('./models/MerchantInventory');

    // 1. 获取所有调货订单
    const transfers = await InventoryTransfer.find({});
    console.log(`\n📋 找到 ${transfers.length} 个调货订单`);

    if (transfers.length === 0) {
      console.log('✅ 没有调货订单需要删除');
      process.exit(0);
    }

    // 2. 恢复库存
    console.log('\n🔄 开始恢复库存...');
    
    for (const transfer of transfers) {
      console.log(`\n处理调货单: ${transfer.transferNumber}`);
      console.log(`  状态: ${transfer.status}`);
      console.log(`  调出方: ${transfer.fromMerchant}`);
      console.log(`  调入方: ${transfer.toMerchant}`);
      console.log(`  产品数量: ${transfer.items.length}`);

      // 如果调货已完成，需要恢复库存
      if (transfer.status === 'completed') {
        console.log('  ⚠️ 调货已完成，需要恢复库存');

        for (const item of transfer.items) {
          // 从调入方删除产品
          const deletedFromTo = await MerchantInventory.deleteMany({
            merchantId: transfer.toMerchant,
            productName: item.productName,
            $or: [
              { serialNumber: item.serialNumber },
              { imei: item.imei },
              { 
                $and: [
                  { serialNumber: { $exists: false } },
                  { imei: { $exists: false } }
                ]
              }
            ]
          });
          console.log(`    - 从 ${transfer.toMerchant} 删除: ${deletedFromTo.deletedCount} 条记录`);

          // 恢复到调出方
          // 查找原始库存记录
          const originalInventory = await MerchantInventory.findById(item.inventoryId);
          
          if (originalInventory) {
            // 恢复数量
            originalInventory.quantity += item.quantity;
            originalInventory.status = 'active';
            await originalInventory.save();
            console.log(`    - 恢复到 ${transfer.fromMerchant}: ${item.productName} × ${item.quantity}`);
          } else {
            console.log(`    - ⚠️ 原始库存记录不存在: ${item.inventoryId}`);
          }
        }
      } else if (transfer.status === 'approved') {
        console.log('  ⚠️ 调货已批准但未完成，恢复库存状态');

        for (const item of transfer.items) {
          // 如果库存被标记为预留，恢复为可用
          await MerchantInventory.updateMany(
            {
              _id: item.inventoryId,
              status: 'reserved'
            },
            {
              $set: { status: 'active' },
              $unset: { reservedFor: '' }
            }
          );
        }
      }
    }

    // 3. 删除所有调货订单
    console.log('\n🗑️ 删除所有调货订单...');
    const deleteResult = await InventoryTransfer.deleteMany({});
    console.log(`✅ 已删除 ${deleteResult.deletedCount} 个调货订单`);

    // 4. 验证结果
    console.log('\n📊 验证结果:');
    const remainingTransfers = await InventoryTransfer.countDocuments({});
    console.log(`  剩余调货订单: ${remainingTransfers}`);

    const inventoryCount = await MerchantInventory.countDocuments({});
    console.log(`  总库存记录: ${inventoryCount}`);

    const activeInventory = await MerchantInventory.countDocuments({ status: 'active' });
    console.log(`  可用库存: ${activeInventory}`);

    const reservedInventory = await MerchantInventory.countDocuments({ status: 'reserved' });
    console.log(`  预留库存: ${reservedInventory}`);

    // 5. 显示各商户的库存统计
    console.log('\n📦 各商户库存统计:');
    const merchants = await MerchantInventory.distinct('merchantId');
    
    for (const merchantId of merchants) {
      const count = await MerchantInventory.countDocuments({ 
        merchantId: merchantId,
        status: 'active',
        quantity: { $gt: 0 }
      });
      const totalQty = await MerchantInventory.aggregate([
        { 
          $match: { 
            merchantId: merchantId,
            status: 'active',
            quantity: { $gt: 0 }
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$quantity' } 
          } 
        }
      ]);
      
      const qty = totalQty.length > 0 ? totalQty[0].total : 0;
      console.log(`  ${merchantId}: ${count} 种产品, ${qty} 件库存`);
    }

    console.log('\n✅ 调货订单已全部删除，库存已恢复！');
    console.log('\n现在可以重新测试调货功能了。');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 执行脚本
resetTransferOrders();
