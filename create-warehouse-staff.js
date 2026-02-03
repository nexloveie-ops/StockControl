require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserNew = require('./models/UserNew');

async function createWarehouseStaff() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('='.repeat(80));
    console.log('📊 创建仓库员工账号');
    console.log('='.repeat(80));

    // 检查用户是否已存在
    const existingUser = await UserNew.findOne({ username: 'warehouse1' });
    
    if (existingUser) {
      console.log('⚠️  用户已存在: warehouse1');
      console.log('\n用户信息:');
      console.log(`   用户名: ${existingUser.username}`);
      console.log(`   角色: ${existingUser.role}`);
      console.log(`   姓名: ${existingUser.name || 'N/A'}`);
      console.log(`   状态: ${existingUser.isActive ? '✅ 活跃' : '❌ 禁用'}`);
    } else {
      // 创建新用户 - 不要手动哈希密码，让模型的 pre('save') 中间件处理
      const newUser = await UserNew.create({
        username: 'warehouse1',
        password: 'warehouse123', // 直接使用明文密码
        role: 'warehouse_manager',
        name: 'Warehouse Staff',
        email: 'warehouse1@stockcontrol.com',
        isActive: true
      });

      console.log('✅ 仓库员工账号创建成功！\n');
      console.log('账号信息:');
      console.log(`   用户名: ${newUser.username}`);
      console.log(`   密码: warehouse123`);
      console.log(`   角色: ${newUser.role}`);
      console.log(`   姓名: ${newUser.name}`);
      console.log(`   邮箱: ${newUser.email}`);
      console.log(`   状态: ${newUser.isActive ? '✅ 活跃' : '❌ 禁用'}`);
    }

    // 显示所有用户
    console.log('\n' + '='.repeat(80));
    console.log('📊 当前所有用户账号');
    console.log('='.repeat(80));
    
    const allUsers = await UserNew.find({}).sort({ role: 1, username: 1 });
    
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. 用户名: ${user.username}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   姓名: ${user.name || 'N/A'}`);
      console.log(`   邮箱: ${user.email || 'N/A'}`);
      console.log(`   状态: ${user.isActive ? '✅ 活跃' : '❌ 禁用'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`总计: ${allUsers.length} 个用户账号`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createWarehouseStaff();
