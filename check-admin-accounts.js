require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');

async function checkAdminAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const users = await UserNew.find({});
    
    console.log('='.repeat(80));
    console.log('📊 当前用户账号列表');
    console.log('='.repeat(80));
    
    if (users.length === 0) {
      console.log('❌ 没有找到任何用户账号！');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. 用户名: ${user.username}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   姓名: ${user.name || 'N/A'}`);
        console.log(`   邮箱: ${user.email || 'N/A'}`);
        console.log(`   状态: ${user.isActive ? '✅ 活跃' : '❌ 禁用'}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`总计: ${users.length} 个用户账号`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkAdminAccounts();
