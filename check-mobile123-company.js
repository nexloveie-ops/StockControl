require('dotenv').config();
const mongoose = require('mongoose');

async function checkMobile123() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const UserNew = require('./models/UserNew');
    
    const mobile123 = await UserNew.findOne({ username: 'Mobile123' }).lean();
    
    console.log('📦 Mobile123用户信息:');
    console.log('用户名:', mobile123?.username);
    console.log('角色:', mobile123?.role);
    console.log('\n公司信息:');
    console.log(JSON.stringify(mobile123?.companyInfo, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkMobile123();
