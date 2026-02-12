require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouse1() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const UserNew = require('./models/UserNew');
    const CompanyInfo = require('./models/CompanyInfo');
    
    // 查询warehouse1用户
    const warehouse1 = await UserNew.findOne({ username: 'warehouse1' }).lean();
    
    console.log('📦 Warehouse1用户信息:');
    console.log('用户名:', warehouse1?.username);
    console.log('角色:', warehouse1?.role);
    console.log('公司信息:', warehouse1?.companyInfo);
    console.log('\n完整用户对象:');
    console.log(JSON.stringify(warehouse1, null, 2));
    
    // 查询默认公司信息
    const defaultCompany = await CompanyInfo.findOne({ isDefault: true }).lean();
    
    console.log('\n\n📋 默认公司信息:');
    console.log('公司名称:', defaultCompany?.companyName);
    console.log('税号:', defaultCompany?.taxNumber);
    console.log('\n完整公司对象:');
    console.log(JSON.stringify(defaultCompany, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkWarehouse1();
