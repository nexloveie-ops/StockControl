require('dotenv').config();
const mongoose = require('mongoose');

async function testStoreGroupsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const StoreGroup = require('./models/StoreGroup');
    const UserNew = require('./models/UserNew');
    
    // 模拟API逻辑
    const groups = await StoreGroup.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    console.log(`找到 ${groups.length} 个群组\n`);
    
    // 统计每个群组的用户数量
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      console.log(`\n处理群组: ${group.name} (${group._id})`);
      
      const userCount = await UserNew.countDocuments({ 
        'retailInfo.storeGroup': group._id,
        isActive: true 
      });
      
      console.log(`  用户数量: ${userCount}`);
      
      // 列出用户
      const users = await UserNew.find({
        'retailInfo.storeGroup': group._id,
        isActive: true
      }).select('username');
      
      console.log(`  用户列表: ${users.map(u => u.username).join(', ')}`);
      
      return {
        ...group.toObject(),
        userCount
      };
    }));
    
    console.log('\n=== API 返回数据 ===\n');
    groupsWithStats.forEach(group => {
      console.log(`群组: ${group.name}`);
      console.log(`  代码: ${group.code}`);
      console.log(`  用户数量: ${group.userCount}`);
      console.log(`  _id: ${group._id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

testStoreGroupsAPI();
