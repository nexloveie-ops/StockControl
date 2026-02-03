/**
 * 创建初始用户账号
 * 用于系统初始化时创建管理员和仓库管理员账号
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

// 创建初始用户
async function createInitialUsers() {
  try {
    const UserNew = require('./models/UserNew');
    
    // 检查是否已存在这些用户
    const existingAdmin = await UserNew.findOne({ username: 'admin' });
    const existingWarehouse = await UserNew.findOne({ username: 'warehouse' });
    
    let createdCount = 0;
    
    // 创建管理员账号
    if (!existingAdmin) {
      console.log('\n📝 创建管理员账号...');
      const admin = new UserNew({
        username: 'admin',
        email: 'admin@celestia.com',
        password: 'admin',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          phone: '1234567890'
        },
        isActive: true,
        isEmailVerified: true
      });
      
      // 设置默认权限
      admin.setDefaultPermissions();
      
      await admin.save();
      console.log('✅ 管理员账号创建成功');
      console.log('   用户名: admin');
      console.log('   密码: admin');
      console.log('   角色: 管理员');
      createdCount++;
    } else {
      console.log('\n⚠️  管理员账号已存在，跳过创建');
      console.log('   用户名: admin');
    }
    
    // 创建仓库管理员账号
    if (!existingWarehouse) {
      console.log('\n📝 创建仓库管理员账号...');
      const warehouse = new UserNew({
        username: 'warehouse',
        email: 'warehouse@celestia.com',
        password: 'warehouse',
        role: 'warehouse_manager',
        profile: {
          firstName: 'Warehouse',
          lastName: 'Manager',
          phone: '0987654321'
        },
        isActive: true,
        isEmailVerified: true
      });
      
      // 设置默认权限
      warehouse.setDefaultPermissions();
      
      await warehouse.save();
      console.log('✅ 仓库管理员账号创建成功');
      console.log('   用户名: warehouse');
      console.log('   密码: warehouse');
      console.log('   角色: 仓库管理员');
      createdCount++;
    } else {
      console.log('\n⚠️  仓库管理员账号已存在，跳过创建');
      console.log('   用户名: warehouse');
    }
    
    // 总结
    console.log('\n' + '='.repeat(50));
    if (createdCount > 0) {
      console.log(`✅ 成功创建 ${createdCount} 个用户账号`);
    } else {
      console.log('ℹ️  所有账号都已存在，无需创建');
    }
    console.log('='.repeat(50));
    
    // 显示登录信息
    console.log('\n📋 登录信息:');
    console.log('\n管理员账号:');
    console.log('  访问地址: http://localhost:3000/login.html');
    console.log('  用户名: admin');
    console.log('  密码: admin');
    console.log('  主页: http://localhost:3000/admin.html');
    
    console.log('\n仓库管理员账号:');
    console.log('  访问地址: http://localhost:3000/login.html');
    console.log('  用户名: warehouse');
    console.log('  密码: warehouse');
    console.log('  主页: http://localhost:3000/prototype-working.html');
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始创建初始用户账号...\n');
  
  try {
    await connectDB();
    await createInitialUsers();
    
    console.log('✅ 初始用户创建完成！\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 执行
main();
