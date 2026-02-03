// 创建测试供应商数据
require('dotenv').config();
const mongoose = require('mongoose');

async function createTestSuppliers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    const SupplierNew = require('./models/SupplierNew');
    const UserNew = require('./models/UserNew');

    // 获取管理员用户ID
    const adminUser = await UserNew.findOne({ username: 'admin' });
    if (!adminUser) {
      console.error('❌ 找不到管理员用户，请先创建管理员账号');
      process.exit(1);
    }
    console.log(`👤 使用管理员账号: ${adminUser.username} (${adminUser._id})`);

    // 检查是否已有供应商
    const existingCount = await SupplierNew.countDocuments();
    console.log(`📊 当前供应商数量: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  数据库中已有供应商数据');
      const choice = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('是否要添加更多测试供应商？(y/n): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'y');
        });
      });
      
      if (!choice) {
        console.log('❌ 取消操作');
        process.exit(0);
      }
    }

    // 创建测试供应商
    const testSuppliers = [
      {
        code: 'SUP001',
        name: 'Apple 官方供应商',
        contact: {
          person: '张经理',
          phone: '+353-1-234-5678',
          email: 'zhang@apple-supplier.com'
        },
        address: {
          street: '123 Tech Street',
          city: 'Dublin',
          state: 'Leinster',
          postalCode: 'D02 XY45',
          country: 'Ireland'
        },
        taxNumber: 'IE1234567T',
        paymentTerms: 'Net 30',
        isActive: true
      },
      {
        code: 'SUP002',
        name: 'Samsung 配件供应商',
        contact: {
          person: '李总',
          phone: '+353-1-345-6789',
          email: 'li@samsung-parts.com'
        },
        address: {
          street: '456 Mobile Avenue',
          city: 'Cork',
          state: 'Munster',
          postalCode: 'T12 AB34',
          country: 'Ireland'
        },
        taxNumber: 'IE2345678U',
        paymentTerms: 'Net 30',
        isActive: true
      },
      {
        code: 'SUP003',
        name: '华为配件批发',
        contact: {
          person: '王先生',
          phone: '+353-1-456-7890',
          email: 'wang@huawei-wholesale.com'
        },
        address: {
          street: '789 Electronics Road',
          city: 'Galway',
          state: 'Connacht',
          postalCode: 'H91 CD56',
          country: 'Ireland'
        },
        taxNumber: 'IE3456789V',
        paymentTerms: 'Net 45',
        isActive: true
      },
      {
        code: 'SUP004',
        name: '小米爱尔兰总代理',
        contact: {
          person: '陈女士',
          phone: '+353-1-567-8901',
          email: 'chen@xiaomi-ireland.com'
        },
        address: {
          street: '321 Smart Device Lane',
          city: 'Limerick',
          state: 'Munster',
          postalCode: 'V94 EF78',
          country: 'Ireland'
        },
        taxNumber: 'IE4567890W',
        paymentTerms: 'Net 30',
        isActive: true
      },
      {
        code: 'SUP005',
        name: '通用配件供应商',
        contact: {
          person: '刘经理',
          phone: '+353-1-678-9012',
          email: 'liu@general-parts.com'
        },
        address: {
          street: '555 Parts Boulevard',
          city: 'Waterford',
          state: 'Munster',
          postalCode: 'X91 GH90',
          country: 'Ireland'
        },
        taxNumber: 'IE5678901X',
        paymentTerms: 'Net 15',
        isActive: true
      }
    ];

    // 插入供应商
    for (const supplierData of testSuppliers) {
      // 检查是否已存在
      const existing = await SupplierNew.findOne({ code: supplierData.code });
      if (existing) {
        console.log(`⏭️  供应商 ${supplierData.code} (${supplierData.name}) 已存在，跳过`);
        continue;
      }

      // 添加 createdBy 字段
      supplierData.createdBy = adminUser._id;

      const supplier = new SupplierNew(supplierData);
      await supplier.save();
      console.log(`✅ 创建供应商: ${supplier.code} - ${supplier.name}`);
    }

    // 显示所有供应商
    const allSuppliers = await SupplierNew.find({ isActive: true });
    console.log('\n📋 当前所有供应商:');
    allSuppliers.forEach(s => {
      console.log(`   ${s.code} - ${s.name} (${s.contact.person})`);
    });

    console.log(`\n✅ 完成！共有 ${allSuppliers.length} 个供应商`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

createTestSuppliers();
