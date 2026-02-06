require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllUsersGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const UserNew = require('./models/UserNew');
    
    // 查询所有零售用户
    const users = await UserNew.find({
      role: 'retail_user',
      isActive: true
    }).select('username profile storeGroup');
    
    console.log('=== 所有零售用户的群组设置 ===\n');
    users.forEach(user => {
      console.log(`用户: ${user.username}`);
      console.log(`  名称: ${user.profile?.firstName || 'N/A'}`);
      console.log(`  群组: ${user.storeGroup || '❌ 未设置'}`);
      console.log('');
    });
    
    // 按群组分组
    console.log('=== 按群组分组 ===\n');
    const groupMap = {};
    users.forEach(user => {
      const group = user.storeGroup || '未设置群组';
      if (!groupMap[group]) {
        groupMap[group] = [];
      }
      groupMap[group].push(user.username);
    });
    
    Object.entries(groupMap).forEach(([group, members]) => {
      console.log(`群组: ${group}`);
      console.log(`  成员: ${members.join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkAllUsersGroups();
