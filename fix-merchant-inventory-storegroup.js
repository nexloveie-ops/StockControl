const mongoose = require('mongoose');
require('dotenv').config();

async function fixMerchantInventoryStoreGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    const StoreGroup = require('./models/StoreGroup');
    
    console.log('\n=== 开始修复库存记录的 storeGroup 字段 ===\n');
    
    // 获取所有没有 storeGroup 的库存记录
    const inventoryWithoutGroup = await MerchantInventory.find({
      $or: [
        { storeGroup: null },
        { storeGroup: { $exists: false } }
      ],
      isActive: true
    });
    
    console.log(`找到 ${inventoryWithoutGroup.length} 条没有 storeGroup 的库存记录\n`);
    
    if (inventoryWithoutGroup.length === 0) {
      console.log('✅ 所有库存记录都已设置 storeGroup');
      process.exit(0);
    }
    
    // 按商户分组
    const byMerchant = {};
    inventoryWithoutGroup.forEach(item => {
      if (!byMerchant[item.merchantId]) {
        byMerchant[item.merchantId] = [];
      }
      byMerchant[item.merchantId].push(item);
    });
    
    console.log('按商户统计:');
    Object.entries(byMerchant).forEach(([merchantId, items]) => {
      console.log(`- ${merchantId}: ${items.length} 条`);
    });
    console.log('');
    
    // 为每个商户的库存设置 storeGroup
    let totalUpdated = 0;
    
    for (const [merchantId, items] of Object.entries(byMerchant)) {
      // 查找用户的 storeGroup
      const user = await UserNew.findOne({ username: merchantId })
        .populate('retailInfo.storeGroup');
      
      if (!user) {
        console.log(`⚠️  用户 ${merchantId} 不存在，跳过`);
        continue;
      }
      
      const storeGroup = user.retailInfo?.storeGroup;
      
      if (!storeGroup) {
        console.log(`⚠️  用户 ${merchantId} 没有分配群组，跳过`);
        continue;
      }
      
      console.log(`\n处理用户 ${merchantId}:`);
      console.log(`  群组: ${storeGroup.name} (${storeGroup.code})`);
      console.log(`  库存记录数: ${items.length}`);
      
      // 批量更新该用户的所有库存记录
      const result = await MerchantInventory.updateMany(
        {
          merchantId: merchantId,
          $or: [
            { storeGroup: null },
            { storeGroup: { $exists: false } }
          ]
        },
        {
          $set: { storeGroup: storeGroup._id }
        }
      );
      
      console.log(`  ✅ 更新了 ${result.modifiedCount} 条记录`);
      totalUpdated += result.modifiedCount;
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`总共更新了 ${totalUpdated} 条库存记录`);
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===\n');
    
    const stillWithoutGroup = await MerchantInventory.countDocuments({
      $or: [
        { storeGroup: null },
        { storeGroup: { $exists: false } }
      ],
      isActive: true
    });
    
    if (stillWithoutGroup === 0) {
      console.log('✅ 所有库存记录都已正确设置 storeGroup');
    } else {
      console.log(`⚠️  还有 ${stillWithoutGroup} 条记录没有 storeGroup`);
    }
    
    // 显示群组库存统计
    const groups = await StoreGroup.find({ isActive: true });
    
    console.log('\n=== 各群组库存统计 ===\n');
    
    for (const group of groups) {
      const count = await MerchantInventory.countDocuments({
        storeGroup: group._id,
        isActive: true
      });
      
      console.log(`${group.name} (${group.code}): ${count} 条库存记录`);
      
      if (count > 0) {
        const byMerchantInGroup = await MerchantInventory.aggregate([
          {
            $match: {
              storeGroup: group._id,
              isActive: true
            }
          },
          {
            $group: {
              _id: '$merchantId',
              count: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ]);
        
        byMerchantInGroup.forEach(item => {
          console.log(`  - ${item._id}: ${item.count} 条记录, 总数量: ${item.totalQuantity}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixMerchantInventoryStoreGroup();
