require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserNew = require('./models/UserNew');

async function createAdminAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('='.repeat(80));
    console.log('📊 创建管理员账号');
    console.log('='.repeat(80));

    // 检查并创建 admin 账号
    let admin = await UserNew.findOne({ username: 'admin' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await UserNew.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        email: 'admin@stockcontrol.com',
        isActive: true
      });
      console.log('✅ 创建管理员账号: admin / admin123');
    } else {
      console.log('✅ 管理员账号已存在: admin');
    }

    // 检查并创建 warehouse_manager 账号
    let warehouseManager = await UserNew.findOne({ username: 'warehouse_manager' });
    if (!warehouseManager) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      warehouseManager = await UserNew.create({
        username: 'warehouse_manager',
        password: hashedPassword,
        role: 'warehouse_manager',
        name: 'Warehouse Manager',
        email: 'warehouse@stockcontrol.com',
        isActive: true
      });
      console.log('✅ 创建仓库管理员账号: warehouse_manager / 123456');
    } else {
      console.log('✅ 仓库管理员账号已存在: warehouse_manager');
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 当前管理员账号');
    console.log('='.repeat(80));
    console.log('\n1. 管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   角色: admin');
    
    console.log('\n2. 仓库管理员账号:');
    console.log('   用户名: warehouse_manager');
    console.log('   密码: 123456');
    console.log('   角色: warehouse_manager');

    console.log('\n✅ 管理员账号创建完成！');

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createAdminAccounts();
