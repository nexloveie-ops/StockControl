const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const ProductCategory = require('../models/ProductCategory');
const ProductNew = require('../models/ProductNew');
const SupplierNew = require('../models/SupplierNew');
const UserNew = require('../models/UserNew');
const StoreGroup = require('../models/StoreGroup');
const Store = require('../models/Store');

async function initDatabase() {
  try {
    // 连接数据库
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 清空现有数据
    console.log('🗑️ 清空现有数据...');
    await ProductCategory.deleteMany({});
    await ProductNew.deleteMany({});
    await SupplierNew.deleteMany({});
    await UserNew.deleteMany({});
    await StoreGroup.deleteMany({});
    await Store.deleteMany({});

    // 创建管理员用户
    console.log('👤 创建管理员用户...');
    const adminUser = new UserNew({
      username: 'admin',
      email: 'admin@stockcontrol.com',
      password: '123456',
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator'
      }
    });
    adminUser.setDefaultPermissions();
    await adminUser.save();
    console.log('✅ 管理员用户创建成功 (用户名: admin, 密码: 123456)');

    // 创建产品分类
    console.log('📂 创建产品分类...');
    const categories = [
      {
        name: '手机配件',
        type: '手机配件',
        description: '手机相关配件产品',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 1
      },
      {
        name: '电脑配件',
        type: '电脑配件',
        description: '电脑相关配件产品',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 2
      },
      {
        name: '车载配件',
        type: '车载配件',
        description: '汽车相关配件产品',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 3
      },
      {
        name: 'Audio设备',
        type: 'Audio',
        description: '音频设备和配件',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 4
      },
      {
        name: '数据线',
        type: '数据线',
        description: '各种数据传输线缆',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 5
      },
      {
        name: '电源供应',
        type: 'Power Supply',
        description: '电源适配器和充电设备',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 6
      },
      {
        name: '全新设备',
        type: '全新设备',
        description: '全新的电子设备',
        defaultVatRate: 'VAT 23%',
        defaultCondition: 'Brand New',
        sortOrder: 7
      },
      {
        name: '二手设备',
        type: '二手设备',
        description: '二手电子设备',
        defaultVatRate: 'VAT 0%',
        defaultCondition: 'Pre-Owned',
        sortOrder: 8
      },
      {
        name: '维修服务',
        type: '维修服务',
        description: '设备维修和服务',
        defaultVatRate: 'VAT 13.5%',
        defaultCondition: 'Brand New',
        sortOrder: 9
      }
    ];

    const createdCategories = await ProductCategory.insertMany(categories);
    console.log(`✅ 创建了 ${createdCategories.length} 个产品分类`);

    // 创建供应商
    console.log('🏢 创建供应商...');
    const suppliers = [
      {
        name: 'TechSource Ltd',
        code: 'TS001',
        contact: {
          person: 'John Smith',
          phone: '+353-1-234-5678',
          email: 'john@techsource.ie',
          address: {
            street: '123 Tech Street',
            city: 'Dublin',
            state: 'Leinster',
            postalCode: 'D02 XY12',
            country: 'Ireland'
          }
        },
        financial: {
          paymentTerms: 'net30',
          creditLimit: 50000
        },
        business: {
          primaryCategories: [createdCategories[0]._id, createdCategories[1]._id],
          type: 'distributor'
        },
        createdBy: adminUser._id
      },
      {
        name: 'Mobile Parts Pro',
        code: 'MPP001',
        contact: {
          person: 'Sarah Connor',
          phone: '+353-1-345-6789',
          email: 'sarah@mobileparts.ie',
          address: {
            street: '456 Mobile Ave',
            city: 'Cork',
            state: 'Munster',
            postalCode: 'T12 ABC3',
            country: 'Ireland'
          }
        },
        financial: {
          paymentTerms: 'net15',
          creditLimit: 30000
        },
        business: {
          primaryCategories: [createdCategories[0]._id],
          type: 'wholesaler'
        },
        createdBy: adminUser._id
      }
    ];

    const createdSuppliers = await SupplierNew.insertMany(suppliers);
    console.log(`✅ 创建了 ${createdSuppliers.length} 个供应商`);

    // 创建示例产品
    console.log('📱 创建示例产品...');
    const products = [
      {
        name: 'iPhone 15 Pro 保护壳',
        sku: 'IPH15-CASE-001',
        category: createdCategories[0]._id,
        description: '高质量透明保护壳，适用于iPhone 15 Pro',
        costPrice: 8.50,
        retailPrice: 25.99,
        condition: 'Brand New',
        vatRate: 'VAT 23%',
        stockQuantity: 50,
        minStockLevel: 10,
        brand: 'Generic',
        model: 'Clear Case',
        createdBy: adminUser._id
      },
      {
        name: 'USB-C 充电线',
        sku: 'USBC-CABLE-001',
        category: createdCategories[4]._id,
        description: '1米长USB-C充电数据线',
        costPrice: 3.20,
        retailPrice: 12.99,
        condition: 'Brand New',
        vatRate: 'VAT 23%',
        stockQuantity: 100,
        minStockLevel: 20,
        brand: 'Generic',
        model: '1M Cable',
        createdBy: adminUser._id
      },
      {
        name: 'MacBook Pro 13" 2023',
        sku: 'MBP13-2023-001',
        category: createdCategories[6]._id,
        description: 'Apple MacBook Pro 13寸 M2芯片 256GB',
        costPrice: 1200.00,
        retailPrice: 1599.99,
        condition: 'Brand New',
        vatRate: 'VAT 23%',
        stockQuantity: 5,
        minStockLevel: 2,
        brand: 'Apple',
        model: 'MacBook Pro 13"',
        createdBy: adminUser._id
      }
    ];

    const createdProducts = await ProductNew.insertMany(products);
    console.log(`✅ 创建了 ${createdProducts.length} 个示例产品`);

    // 创建店面组和店面
    console.log('🏪 创建店面组和店面...');
    const storeGroup = new StoreGroup({
      name: 'TechRetail Group',
      code: 'TRG001',
      description: '科技零售连锁店集团',
      headquarters: {
        address: {
          street: '789 Business Park',
          city: 'Dublin',
          state: 'Leinster',
          postalCode: 'D04 XY56',
          country: 'Ireland'
        },
        phone: '+353-1-456-7890',
        email: 'hq@techretail.ie'
      },
      settings: {
        allowInventorySharing: true,
        allowStoreTransfers: true,
        uniformPricing: false
      },
      createdBy: adminUser._id
    });
    await storeGroup.save();

    const stores = [
      {
        name: 'TechRetail Dublin Central',
        code: 'TRD001',
        storeGroup: storeGroup._id,
        type: 'chain_member',
        address: {
          street: '123 Grafton Street',
          city: 'Dublin',
          postalCode: 'D02 XY78',
          country: 'Ireland'
        },
        contact: {
          phone: '+353-1-567-8901',
          email: 'dublin@techretail.ie',
          manager: 'Mike Johnson'
        },
        createdBy: adminUser._id
      },
      {
        name: 'TechRetail Cork',
        code: 'TRC001',
        storeGroup: storeGroup._id,
        type: 'chain_member',
        address: {
          street: '456 Patrick Street',
          city: 'Cork',
          postalCode: 'T12 DEF9',
          country: 'Ireland'
        },
        contact: {
          phone: '+353-21-678-9012',
          email: 'cork@techretail.ie',
          manager: 'Lisa Brown'
        },
        createdBy: adminUser._id
      }
    ];

    const createdStores = await Store.insertMany(stores);
    console.log(`✅ 创建了 1 个店面组和 ${createdStores.length} 个店面`);

    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 创建的数据摘要：');
    console.log(`   👤 用户: 1 个 (admin/123456)`);
    console.log(`   📂 产品分类: ${createdCategories.length} 个`);
    console.log(`   🏢 供应商: ${createdSuppliers.length} 个`);
    console.log(`   📱 产品: ${createdProducts.length} 个`);
    console.log(`   🏪 店面: ${createdStores.length} 个`);
    console.log('\n🚀 现在可以启动应用并使用管理员账户登录！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;