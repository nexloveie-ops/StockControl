require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const users = await User.find();
    console.log(`找到 ${users.length} 个用户\n`);
    
    if (users.length === 0) {
      console.log('⚠️  数据库中没有用户数据');
      return;
    }
    
    console.log('👥 所有用户详细信息:');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. 用户名: ${user.username}`);
      console.log(`   _id: ${user._id}`);
      console.log(`   userId: ${user.userId || '❌ 未设置'}`);
      console.log(`   groupId: ${user.groupId || '❌ 未设置'}`);
      console.log(`   role: ${user.role}`);
      console.log(`   email: ${user.email}`);
      console.log(`   isActive: ${user.isActive}`);
      console.log(`   createdAt: ${user.createdAt}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n\n✅ 数据库连接已关闭');
  }
}

checkUsers();
