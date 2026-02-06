const mongoose = require('mongoose');
require('dotenv').config();

async function checkGroupInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');
    const StoreGroup = require('./models/StoreGroup');
    
    // 1. 检查 MurrayDundrum 的群组
    const user = await UserNew.findOne({ username: 'MurrayDundrum' })
      .populate('retailInfo.storeGroup');
    
    console.log('\n=== MurrayDundrum 用户信息 ===');
    console.log('用户名:', user.username);
    console.log('用户ID:', user._id);
    console.log('群组ID:', user.retailInfo?.storeGroup?._id);
    console.log('群组名称:', user.retailInfo?.storeGroup?.name);
    console.log('可查看群组库存:', user.retailInfo?.canViewGroupInventory);
    console.log('可从群组调货:', user.retailInfo?.canTransferFromGroup);
    
    const groupId = user.retailInfo?.storeGroup?._id;
    
    if (!groupId) {
      console.log('\n⚠️  用户没有分配群组');
      process.exit(0);
    }
    
    // 2. 检查该群组的所有用户
    const groupUsers = await UserNew.find({
      'retailInfo.storeGroup': groupId,
      isActive: true
    });
    
    console.log('\n=== 群组内的用户 ===');
    console.log('总用户数:', groupUsers.length);
    groupUsers.forEach(u => {
      console.log(`- ${u.username} (${u.role})`);
    });
    
    // 3. 检查该群组的所有库存
    const allInventory = await MerchantInventory.find({
      storeGroup: groupId,
      isActive: true
    });
    
    console.log('\n=== 群组库存总览 ===');
    console.log('总记录数:', allInventory.length);
    
    if (allInventory.length === 0) {
      console.log('\n⚠️  群组内没有任何库存记录');
      console.log('可能原因:');
      console.log('1. 群组成员还没有添加库存');
      console.log('2. 库存记录的 storeGroup 字段没有正确设置');
      
      // 检查是否有不带 storeGroup 的库存
      const noGroupInventory = await MerchantInventory.find({
        merchantId: { $in: groupUsers.map(u => u.username) },
        isActive: true
      });
      
      console.log('\n=== 群组成员的所有库存（不限 storeGroup）===');
      console.log('总记录数:', noGroupInventory.length);
      
      const byMerchant = {};
      noGroupInventory.forEach(item => {
        if (!byMerchant[item.merchantId]) {
          byMerchant[item.merchantId] = {
            total: 0,
            withGroup: 0,
            withoutGroup: 0
          };
        }
        byMerchant[item.merchantId].total++;
        if (item.storeGroup) {
          byMerchant[item.merchantId].withGroup++;
        } else {
          byMerchant[item.merchantId].withoutGroup++;
        }
      });
      
      console.log('\n按商户统计:');
      Object.entries(byMerchant).forEach(([merchantId, stats]) => {
        console.log(`- ${merchantId}:`);
        console.log(`  总数: ${stats.total}`);
        console.log(`  有群组: ${stats.withGroup}`);
        console.log(`  无群组: ${stats.withoutGroup}`);
      });
      
      process.exit(0);
    }
    
    const byMerchant = {};
    allInventory.forEach(item => {
      if (!byMerchant[item.merchantId]) {
        byMerchant[item.merchantId] = {
          total: 0,
          active: 0,
          sold: 0,
          inStock: 0
        };
      }
      byMerchant[item.merchantId].total++;
      if (item.status === 'active') {
        byMerchant[item.merchantId].active++;
        if (item.quantity > 0) {
          byMerchant[item.merchantId].inStock++;
        }
      }
      if (item.status === 'sold') {
        byMerchant[item.merchantId].sold++;
      }
    });
    
    console.log('\n按商户统计:');
    Object.entries(byMerchant).forEach(([merchantId, stats]) => {
      console.log(`- ${merchantId}:`);
      console.log(`  总数: ${stats.total}`);
      console.log(`  活跃: ${stats.active}`);
      console.log(`  有库存: ${stats.inStock}`);
      console.log(`  已售: ${stats.sold}`);
    });
    
    // 4. 检查其他商户的可用库存（MurrayDundrum 应该能看到的）
    const otherInventory = await MerchantInventory.find({
      storeGroup: groupId,
      merchantId: { $ne: 'MurrayDundrum' },
      status: 'active',
      isActive: true,
      quantity: { $gt: 0 }
    });
    
    console.log('\n=== MurrayDundrum 应该能看到的库存 ===');
    console.log('记录数:', otherInventory.length);
    
    if (otherInventory.length > 0) {
      console.log('\n前5条记录:');
      otherInventory.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productName}`);
        console.log(`   商户: ${item.merchantId}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   状态: ${item.status}`);
        console.log(`   群组: ${item.storeGroup}`);
        console.log(`   序列号: ${item.serialNumber || '无'}`);
      });
    } else {
      console.log('\n⚠️  没有找到其他商户的可用库存');
      console.log('\n可能原因:');
      console.log('1. 其他商户还没有添加库存');
      console.log('2. 所有库存都已售出或数量为0');
      console.log('3. 库存状态不是 active');
      
      // 检查其他商户的所有库存（不限状态和数量）
      const allOtherInventory = await MerchantInventory.find({
        storeGroup: groupId,
        merchantId: { $ne: 'MurrayDundrum' },
        isActive: true
      });
      
      console.log('\n其他商户的所有库存（不限状态）:', allOtherInventory.length, '条');
      
      if (allOtherInventory.length > 0) {
        console.log('\n状态分布:');
        const statusCount = {};
        allOtherInventory.forEach(item => {
          const key = `${item.status} (qty: ${item.quantity})`;
          statusCount[key] = (statusCount[key] || 0) + 1;
        });
        Object.entries(statusCount).forEach(([status, count]) => {
          console.log(`- ${status}: ${count} 条`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkGroupInventory();
