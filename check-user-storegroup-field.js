require('dotenv').config();
const mongoose = require('mongoose');

async function checkUserStoreGroupField() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    const StoreGroup = require('./models/StoreGroup');
    
    // 查询所有用户
    const allUsers = await UserNew.find({ role: 'retail_user', isActive: true });
    
    console.log('=== 检查所有用户的 storeGroup 字段位置 ===\n');
    
    for (const user of allUsers) {
      console.log(`用户: ${user.username}`);
      
      // 检查顶层 storeGroup
      const topLevelStoreGroup = user.get('storeGroup');
      console.log(`  顶层 storeGroup: ${topLevelStoreGroup || '无'}`);
      
      // 检查 retailInfo.storeGroup
      const retailInfoStoreGroup = user.retailInfo?.storeGroup;
      console.log(`  retailInfo.storeGroup: ${retailInfoStoreGroup || '无'}`);
      
      console.log('');
    }
    
    // 测试查询
    console.log('\n=== 测试查询 ===\n');
    
    const groupId = '69834c8de75caaea2d676f6d';
    
    // 方法1：查询 retailInfo.storeGroup
    const count1 = await UserNew.countDocuments({
      'retailInfo.storeGroup': new mongoose.Types.ObjectId(groupId),
      isActive: true
    });
    console.log(`使用 'retailInfo.storeGroup' 查询: ${count1} 人`);
    
    // 方法2：查询顶层 storeGroup
    const count2 = await UserNew.countDocuments({
      'storeGroup': new mongoose.Types.ObjectId(groupId),
      isActive: true
    });
    console.log(`使用 'storeGroup' 查询: ${count2} 人`);
    
    // 列出匹配的用户
    const users = await UserNew.find({
      'retailInfo.storeGroup': new mongoose.Types.ObjectId(groupId),
      isActive: true
    }).select('username profile');
    
    console.log(`\n匹配的用户:`);
    users.forEach(u => {
      console.log(`  - ${u.username} (${u.profile?.firstName || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkUserStoreGroupField();
