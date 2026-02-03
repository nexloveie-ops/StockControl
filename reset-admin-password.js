/**
 * 重置admin用户密码
 * 将admin用户的密码重置为 "admin"
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功');
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    process.exit(1);
  }
}

// 重置admin密码
async function resetAdminPassword() {
  try {
    const UserNew = require('./models/UserNew');
    
    // 查找admin用户
    const admin = await UserNew.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ 未找到admin用户');
      return;
    }
    
    console.log('\n📝 找到admin用户:');
    console.log(`   用户名: ${admin.username}`);
    console.log(`   邮箱: ${admin.email}`);
    console.log(`   角色: ${admin.role}`);
    
    // 修改密码（密码必须至少6位）
    console.log('\n🔧 正在修改密码...');
    admin.password = 'admin123';
    await admin.save();
    
    console.log('✅ 密码修改成功！');
    console.log('\n📋 新的登录信息:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   登录地址: http://localhost:3000/login.html');
    console.log('   主页: http://localhost:3000/admin.html');
    
  } catch (error) {
    console.error('❌ 修改密码失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始重置admin密码...\n');
  
  try {
    await connectDB();
    await resetAdminPassword();
    
    console.log('\n✅ 密码重置完成！\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 执行
main();
