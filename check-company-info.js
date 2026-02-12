require('dotenv').config();
const mongoose = require('mongoose');

async function checkCompanyInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const CompanyInfo = require('./models/CompanyInfo');
    const UserNew = require('./models/UserNew');

    console.log('=== 查找公司信息（CompanyInfo表）===');
    const companyInfos = await CompanyInfo.find();
    
    if (companyInfos.length > 0) {
      companyInfos.forEach(info => {
        console.log(`\n公司ID: ${info._id}`);
        console.log(`公司名称: ${info.companyName}`);
        console.log(`是否默认: ${info.isDefault}`);
        console.log(`地址: ${JSON.stringify(info.address, null, 2)}`);
        console.log(`联系方式: ${JSON.stringify(info.contact, null, 2)}`);
        console.log(`税号: ${info.taxNumber}`);
        console.log(`银行信息: ${JSON.stringify(info.bankDetails, null, 2)}`);
      });
    } else {
      console.log('❌ 未找到公司信息记录');
    }

    console.log('\n=== 查找用户信息（UserNew表）===');
    const users = await UserNew.find({ role: { $in: ['admin', 'warehouse_manager'] } });
    
    if (users.length > 0) {
      for (const user of users) {
        console.log(`\n用户名: ${user.username}`);
        console.log(`角色: ${user.role}`);
        console.log(`邮箱: ${user.email}`);
        console.log(`公司信息: ${user.companyInfo ? JSON.stringify(user.companyInfo, null, 2) : '未设置'}`);
      }
    } else {
      console.log('❌ 未找到管理员用户');
    }

    console.log('\n=== 测试用户profile API ===');
    const currentUser = 'admin'; // 或者 'warehouse1'
    console.log(`测试用户: ${currentUser}`);
    
    const user = await UserNew.findOne({ username: currentUser });
    if (user) {
      console.log(`\n用户找到: ${user.username}`);
      console.log(`用户companyInfo字段: ${user.companyInfo ? '存在' : '不存在'}`);
      
      if (user.companyInfo) {
        console.log(`公司信息内容:`, JSON.stringify(user.companyInfo, null, 2));
      } else {
        console.log('⚠️ 用户没有companyInfo字段');
        
        // 检查是否有默认的CompanyInfo
        const defaultCompanyInfo = await CompanyInfo.findOne({ isDefault: true });
        if (defaultCompanyInfo) {
          console.log('\n✅ 找到默认公司信息:');
          console.log(JSON.stringify(defaultCompanyInfo, null, 2));
        } else {
          console.log('\n❌ 也没有找到默认的公司信息');
        }
      }
    } else {
      console.log(`❌ 未找到用户: ${currentUser}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkCompanyInfo();
