require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');

async function deleteWarehouse1() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const result = await UserNew.deleteOne({ username: 'warehouse1' });
    
    if (result.deletedCount > 0) {
      console.log('✅ 已删除用户: warehouse1');
    } else {
      console.log('⚠️  用户不存在: warehouse1');
    }

    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

deleteWarehouse1();
