require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');
const StoreGroup = require('./models/StoreGroup');

async function setupStoreGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 查找管理员用户作为创建者
    const admin = await UserNew.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ 找不到管理员用户');
      return;
    }
    
    // 创建或查找 Murray 店面组
    let storeGroup = await StoreGroup.findOne({ code: 'MURRAY' });
    
    if (!storeGroup) {
      console.log('创建新的店面组...');
      storeGroup = await StoreGroup.create({
        name: 'Murray Mobile Stores',
        code: 'MURRAY',
        description: 'Murray 连锁手机店',
        headquarters: {
          address: {
            city: 'Dublin',
            country: 'Ireland'
          },
          email: 'info@murray-mobile.ie'
        },
        settings: {
          allowInventorySharing: true,
          allowStoreTransfers: true,
          uniformPricing: false,
          centralInventoryManagement: false
        },
        isActive: true,
        createdBy: admin._id
      });
      console.log(`✅ 创建店面组: ${storeGroup.name} (ID: ${storeGroup._id})`);
    } else {
      console.log(`✅ 找到现有店面组: ${storeGroup.name} (ID: ${storeGroup._id})`);
    }
    
    // 更新两个用户，将他们加入同一个店面组
    const usernames = ['MurrayRanelagh', 'MurrayDundrum'];
    
    for (const username of usernames) {
      const result = await UserNew.updateOne(
        { username },
        {
          $set: {
            'retailInfo.storeType': 'chain_store',
            'retailInfo.storeGroup': storeGroup._id,
            'retailInfo.canViewGroupInventory': true,
            'retailInfo.canTransferFromGroup': true
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ 更新用户 ${username} 加入店面组`);
      } else {
        console.log(`⚠️  用户 ${username} 可能已经在店面组中`);
      }
    }
    
    // 验证更新结果
    console.log('\n=== 验证结果 ===');
    const users = await UserNew.find({
      username: { $in: usernames }
    }).select('username retailInfo');
    
    users.forEach(user => {
      console.log(`\n用户: ${user.username}`);
      console.log(`店面类型: ${user.retailInfo?.storeType}`);
      console.log(`店面组 ID: ${user.retailInfo?.storeGroup}`);
      console.log(`可查看群组库存: ${user.retailInfo?.canViewGroupInventory}`);
      console.log(`可从群组调货: ${user.retailInfo?.canTransferFromGroup}`);
    });
    
    // 检查群组关系
    const group1 = users[0].retailInfo?.storeGroup?.toString();
    const group2 = users[1].retailInfo?.storeGroup?.toString();
    
    console.log('\n=== 群组关系 ===');
    if (group1 && group2 && group1 === group2) {
      console.log('✅ 两个用户现在在同一个群组');
      console.log(`群组 ID: ${group1}`);
    } else {
      console.log('❌ 设置失败，用户不在同一个群组');
    }
    
    // 更新 MerchantInventory 记录，添加 storeGroup 字段
    const MerchantInventory = require('./models/MerchantInventory');
    
    console.log('\n=== 更新库存记录 ===');
    for (const username of usernames) {
      const result = await MerchantInventory.updateMany(
        { merchantId: username },
        { $set: { storeGroup: storeGroup._id } }
      );
      console.log(`✅ 更新 ${username} 的 ${result.modifiedCount} 条库存记录`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

setupStoreGroup();
