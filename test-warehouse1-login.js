require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserNew = require('./models/UserNew');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const username = 'warehouse1';
    const password = 'warehouse123';

    console.log('='.repeat(80));
    console.log('🔐 测试登录');
    console.log('='.repeat(80));
    console.log(`用户名: ${username}`);
    console.log(`密码: ${password}\n`);

    // 查找用户
    const user = await UserNew.findOne({ username });
    
    if (!user) {
      console.log('❌ 用户不存在！');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ 找到用户:');
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   状态: ${user.isActive ? '✅ 活跃' : '❌ 禁用'}`);
    console.log(`   密码哈希: ${user.password.substring(0, 20)}...`);

    // 测试密码
    console.log('\n🔍 测试密码验证...');
    
    // 方法 1: 使用 bcrypt.compare
    const isMatch1 = await bcrypt.compare(password, user.password);
    console.log(`   bcrypt.compare: ${isMatch1 ? '✅ 匹配' : '❌ 不匹配'}`);
    
    // 方法 2: 使用用户模型的方法
    if (user.comparePassword) {
      const isMatch2 = await user.comparePassword(password);
      console.log(`   user.comparePassword: ${isMatch2 ? '✅ 匹配' : '❌ 不匹配'}`);
    }

    // 测试错误密码
    console.log('\n🔍 测试错误密码...');
    const wrongPassword = 'wrongpassword';
    const isMatch3 = await bcrypt.compare(wrongPassword, user.password);
    console.log(`   错误密码 "${wrongPassword}": ${isMatch3 ? '✅ 匹配' : '❌ 不匹配'}`);

    if (isMatch1) {
      console.log('\n✅ 登录测试成功！密码验证正常。');
    } else {
      console.log('\n❌ 登录测试失败！密码不匹配。');
      console.log('\n尝试重置密码...');
      
      // 重置密码
      user.password = await bcrypt.hash(password, 10);
      await user.save();
      
      console.log('✅ 密码已重置！');
      
      // 再次测试
      const user2 = await UserNew.findOne({ username });
      const isMatch4 = await bcrypt.compare(password, user2.password);
      console.log(`   重新测试: ${isMatch4 ? '✅ 匹配' : '❌ 不匹配'}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testLogin();
