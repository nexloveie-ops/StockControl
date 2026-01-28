const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const Product3C = require('../models/Product3C');
const User3C = require('../models/User3C');
const Supplier3C = require('../models/Supplier3C');
const SalesInvoice = require('../models/SalesInvoice');
const PurchaseOrder = require('../models/PurchaseOrder');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/3c-product-system';

// 测试数据
const seedData = async () => {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 清空现有数据
    console.log('🗑️  清空现有数据...');
    await Product3C.deleteMany({});
    await User3C.deleteMany({});
    await Supplier3C.deleteMany({});
    await SalesInvoice.deleteMany({});
    await PurchaseOrder.deleteMany({});

    // 创建供应商
    console.log('📦 创建供应商...');
    const suppliers = await Supplier3C.insertMany([
      {
        name: '深圳华强电子',
        contactPerson: '张经理',
        email: 'zhang@huaqiang.com',
        phone: '0755-12345678',
        address: '深圳市福田区华强北路1号',
        taxId: 'TAX001',
        paymentTerms: 'NET_30',
        active: true
      },
      {
        name: '广州科技批发',
        contactPerson: '李总',
        email: 'li@gztech.com',
        phone: '020-87654321',
        address: '广州市天河区科技园',
        taxId: 'TAX002',
        paymentTerms: 'NET_60',
        active: true
      },
      {
        name: '北京电子城',
        contactPerson: '王主管',
        email: 'wang@bjec.com',
        phone: '010-66778899',
        address: '北京市海淀区中关村',
        taxId: 'TAX003',
        paymentTerms: 'CASH',
        active: true
      }
    ]);
    console.log(`✅ 创建了 ${suppliers.length} 个供应商`);

    // 创建用户
    console.log('👥 创建用户...');
    const users = await User3C.insertMany([
      {
        username: 'admin',
        email: 'admin@3c.com',
        password: 'admin123',
        role: 'ADMINISTRATOR',
        isActive: true
      },
      {
        username: 'warehouse1',
        email: 'warehouse1@3c.com',
        password: 'warehouse123',
        role: 'WAREHOUSE_STAFF',
        discountRange: { minPercent: 0, maxPercent: 10 },
        isActive: true
      },
      {
        username: 'merchant_vip',
        email: 'vip@merchant.com',
        password: 'merchant123',
        role: 'WHOLESALE_MERCHANT',
        merchantTier: { tierName: 'VIP', tierLevel: 1 },
        isActive: true
      },
      {
        username: 'merchant_gold',
        email: 'gold@merchant.com',
        password: 'merchant123',
        role: 'WHOLESALE_MERCHANT',
        merchantTier: { tierName: 'Gold', tierLevel: 2 },
        isActive: true
      },
      {
        username: 'customer1',
        email: 'customer1@email.com',
        password: 'customer123',
        role: 'RETAIL_CUSTOMER',
        isActive: true
      }
    ]);
    console.log(`✅ 创建了 ${users.length} 个用户`);

    // 创建配件类产品
    console.log('📱 创建配件类产品...');
    const accessories = await Product3C.insertMany([
      {
        name: 'iPhone 15 Pro 保护壳',
        productType: '保护壳',
        category: 'ACCESSORY',
        barcode: '8901234567890',
        quantity: 150,
        purchasePrice: 15.00,
        purchaseTax: 3.45,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 39.99,
        wholesalePrice: 25.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 22.00 },
          { tierName: 'Gold', tierLevel: 2, price: 24.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'A-01',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'USB-C 数据线 2米',
        productType: '数据线',
        category: 'ACCESSORY',
        barcode: '8901234567891',
        quantity: 300,
        purchasePrice: 5.00,
        purchaseTax: 1.15,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 15.99,
        wholesalePrice: 10.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 8.50 },
          { tierName: 'Gold', tierLevel: 2, price: 9.50 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'A-02',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'USB-C 数据线 1米',
        productType: '数据线',
        category: 'ACCESSORY',
        barcode: '8901234567893',
        quantity: 200,
        purchasePrice: 4.00,
        purchaseTax: 0.92,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 12.99,
        wholesalePrice: 8.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 7.00 },
          { tierName: 'Gold', tierLevel: 2, price: 7.50 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'A-02',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: '无线充电器 15W',
        productType: '充电器',
        category: 'ACCESSORY',
        barcode: '8901234567892',
        quantity: 80,
        purchasePrice: 25.00,
        purchaseTax: 5.75,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 69.99,
        wholesalePrice: 45.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 40.00 },
          { tierName: 'Gold', tierLevel: 2, price: 43.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'A-03',
        supplier: suppliers[1]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: '快充充电器 20W',
        productType: '充电器',
        category: 'ACCESSORY',
        barcode: '8901234567894',
        quantity: 120,
        purchasePrice: 18.00,
        purchaseTax: 4.14,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 49.99,
        wholesalePrice: 32.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 28.00 },
          { tierName: 'Gold', tierLevel: 2, price: 30.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'A-03',
        supplier: suppliers[1]._id,
        salesStatus: 'UNSOLD'
      }
    ]);
    console.log(`✅ 创建了 ${accessories.length} 个配件产品`);

    // 创建全新设备
    console.log('📱 创建全新设备...');
    const newDevices = await Product3C.insertMany([
      {
        name: 'iPhone 15 Pro 256GB',
        productType: 'iPhone 15 Pro 256GB',
        category: 'NEW_DEVICE',
        serialNumber: 'SN1234567890001',
        deviceType: 'NEW',
        purchasePrice: 800.00,
        purchaseTax: 184.00,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 1299.99,
        wholesalePrice: 1100.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 1050.00 },
          { tierName: 'Gold', tierLevel: 2, price: 1080.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'B-01',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'iPhone 15 Pro 256GB',
        productType: 'iPhone 15 Pro 256GB',
        category: 'NEW_DEVICE',
        serialNumber: 'SN1234567890004',
        deviceType: 'NEW',
        purchasePrice: 800.00,
        purchaseTax: 184.00,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 1299.99,
        wholesalePrice: 1100.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 1050.00 },
          { tierName: 'Gold', tierLevel: 2, price: 1080.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'B-01',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'Samsung Galaxy S24 Ultra 512GB',
        productType: 'Samsung Galaxy S24 Ultra 512GB',
        category: 'NEW_DEVICE',
        serialNumber: 'SN1234567890002',
        deviceType: 'NEW',
        purchasePrice: 900.00,
        purchaseTax: 207.00,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 1499.99,
        wholesalePrice: 1250.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 1200.00 },
          { tierName: 'Gold', tierLevel: 2, price: 1230.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'B-02',
        supplier: suppliers[1]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'MacBook Pro 14" M3',
        productType: 'MacBook Pro 14" M3',
        category: 'NEW_DEVICE',
        serialNumber: 'SN1234567890003',
        deviceType: 'NEW',
        purchasePrice: 1500.00,
        purchaseTax: 345.00,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 2299.99,
        wholesalePrice: 1950.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 1850.00 },
          { tierName: 'Gold', tierLevel: 2, price: 1900.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'B-03',
        supplier: suppliers[2]._id,
        salesStatus: 'UNSOLD'
      }
    ]);
    console.log(`✅ 创建了 ${newDevices.length} 个全新设备`);

    // 创建二手设备
    console.log('📱 创建二手设备...');
    const usedDevices = await Product3C.insertMany([
      {
        name: 'iPhone 13 Pro 128GB (二手 A+)',
        productType: 'iPhone 13 Pro 128GB',
        category: 'USED_DEVICE',
        serialNumber: 'IMEI123456789001',
        deviceType: 'USED',
        conditionGrade: 'A_PLUS',
        purchasePrice: 400.00,
        purchaseTax: 0.00,
        taxClassification: 'MARGIN_VAT_0',
        suggestedRetailPrice: 699.99,
        wholesalePrice: 580.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 550.00 },
          { tierName: 'Gold', tierLevel: 2, price: 570.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'C-01',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'iPhone 13 Pro 128GB (二手 A)',
        productType: 'iPhone 13 Pro 128GB',
        category: 'USED_DEVICE',
        serialNumber: 'IMEI123456789004',
        deviceType: 'USED',
        conditionGrade: 'A',
        purchasePrice: 380.00,
        purchaseTax: 0.00,
        taxClassification: 'MARGIN_VAT_0',
        suggestedRetailPrice: 649.99,
        wholesalePrice: 550.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 520.00 },
          { tierName: 'Gold', tierLevel: 2, price: 540.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'C-01',
        supplier: suppliers[0]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'Samsung Galaxy S22 256GB (二手 A)',
        productType: 'Samsung Galaxy S22 256GB',
        category: 'USED_DEVICE',
        serialNumber: 'IMEI123456789002',
        deviceType: 'USED',
        conditionGrade: 'A',
        purchasePrice: 300.00,
        purchaseTax: 69.00,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: 549.99,
        wholesalePrice: 450.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 420.00 },
          { tierName: 'Gold', tierLevel: 2, price: 440.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'C-02',
        supplier: suppliers[1]._id,
        salesStatus: 'UNSOLD'
      },
      {
        name: 'iPad Air 64GB (二手 B)',
        productType: 'iPad Air 64GB',
        category: 'USED_DEVICE',
        serialNumber: 'IMEI123456789003',
        deviceType: 'USED',
        conditionGrade: 'B',
        purchasePrice: 200.00,
        purchaseTax: 0.00,
        taxClassification: 'MARGIN_VAT_0',
        suggestedRetailPrice: 399.99,
        wholesalePrice: 320.00,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: 300.00 },
          { tierName: 'Gold', tierLevel: 2, price: 310.00 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: 'C-03',
        supplier: suppliers[2]._id,
        salesStatus: 'UNSOLD'
      }
    ]);
    console.log(`✅ 创建了 ${usedDevices.length} 个二手设备`);

    // 创建示例销售发票
    console.log('🧾 创建示例销售发票...');
    const invoice = await SalesInvoice.create({
      invoiceNumber: 'INV-2024-0001',
      customer: {
        name: '张三',
        email: 'zhangsan@email.com',
        phone: '13800138000',
        customerType: 'RETAIL'
      },
      lineItems: [
        {
          productId: accessories[0]._id,
          productName: accessories[0].name,
          quantity: 2,
          unitPrice: 39.99,
          taxClassification: 'VAT_23',
          taxAmount: 18.40,
          lineTotal: 79.98,
          warehouseLocation: 'A-01'
        }
      ],
      subtotal: 79.98,
      discountPercent: 5,
      discountAmount: 4.00,
      taxAmount: 18.40,
      totalAmount: 94.38,
      status: 'FINALIZED',
      createdBy: users[1]._id,
      finalizedAt: new Date()
    });
    console.log(`✅ 创建了示例销售发票`);

    // 创建更多历史销售数据
    console.log('📊 创建历史销售数据...');
    
    // 获取当前日期和上个月日期
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 生成过去30天的销售数据
    const historicalInvoices = [];
    
    // 数据线销售（过去30天卖了45个）
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);
      
      historicalInvoices.push({
        invoiceNumber: `INV-${currentYear}-${String(1000 + i).padStart(4, '0')}`,
        customer: {
          name: `客户${i + 1}`,
          customerType: Math.random() > 0.5 ? 'RETAIL' : 'WHOLESALE'
        },
        lineItems: [{
          productId: accessories[1]._id, // USB-C 数据线 2米
          productName: accessories[1].name,
          quantity: Math.floor(Math.random() * 4) + 1,
          unitPrice: accessories[1].suggestedRetailPrice,
          taxClassification: 'VAT_23',
          taxAmount: accessories[1].suggestedRetailPrice * 0.23,
          lineTotal: accessories[1].suggestedRetailPrice,
          warehouseLocation: 'A-02'
        }],
        subtotal: accessories[1].suggestedRetailPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: accessories[1].suggestedRetailPrice * 0.23,
        totalAmount: accessories[1].suggestedRetailPrice * 1.23,
        status: 'FINALIZED',
        createdBy: users[1]._id,
        createdAt: saleDate,
        finalizedAt: saleDate
      });
    }
    
    // 充电器销售（过去30天卖了12个）
    for (let i = 0; i < 12; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);
      
      historicalInvoices.push({
        invoiceNumber: `INV-${currentYear}-${String(2000 + i).padStart(4, '0')}`,
        customer: {
          name: `客户${i + 20}`,
          customerType: Math.random() > 0.5 ? 'RETAIL' : 'WHOLESALE'
        },
        lineItems: [{
          productId: accessories[3]._id, // 无线充电器
          productName: accessories[3].name,
          quantity: 1,
          unitPrice: accessories[3].suggestedRetailPrice,
          taxClassification: 'VAT_23',
          taxAmount: accessories[3].suggestedRetailPrice * 0.23,
          lineTotal: accessories[3].suggestedRetailPrice,
          warehouseLocation: 'A-03'
        }],
        subtotal: accessories[3].suggestedRetailPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: accessories[3].suggestedRetailPrice * 0.23,
        totalAmount: accessories[3].suggestedRetailPrice * 1.23,
        status: 'FINALIZED',
        createdBy: users[1]._id,
        createdAt: saleDate,
        finalizedAt: saleDate
      });
    }
    
    // iPhone 15 Pro 销售（过去30天卖了3台）
    for (let i = 0; i < 3; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);
      
      historicalInvoices.push({
        invoiceNumber: `INV-${currentYear}-${String(3000 + i).padStart(4, '0')}`,
        customer: {
          name: `客户${i + 40}`,
          customerType: 'RETAIL'
        },
        lineItems: [{
          productId: newDevices[0]._id, // iPhone 15 Pro
          productName: newDevices[0].name,
          quantity: 1,
          unitPrice: newDevices[0].suggestedRetailPrice,
          taxClassification: 'VAT_23',
          taxAmount: newDevices[0].suggestedRetailPrice * 0.23,
          lineTotal: newDevices[0].suggestedRetailPrice,
          warehouseLocation: 'B-01'
        }],
        subtotal: newDevices[0].suggestedRetailPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: newDevices[0].suggestedRetailPrice * 0.23,
        totalAmount: newDevices[0].suggestedRetailPrice * 1.23,
        status: 'FINALIZED',
        createdBy: users[1]._id,
        createdAt: saleDate,
        finalizedAt: saleDate
      });
    }
    
    // iPhone 13 Pro 二手销售（过去30天卖了5台）
    for (let i = 0; i < 5; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);
      
      historicalInvoices.push({
        invoiceNumber: `INV-${currentYear}-${String(4000 + i).padStart(4, '0')}`,
        customer: {
          name: `客户${i + 50}`,
          customerType: Math.random() > 0.3 ? 'RETAIL' : 'WHOLESALE'
        },
        lineItems: [{
          productId: usedDevices[0]._id, // iPhone 13 Pro
          productName: usedDevices[0].name,
          quantity: 1,
          unitPrice: usedDevices[0].suggestedRetailPrice,
          taxClassification: 'MARGIN_VAT_0',
          taxAmount: 0,
          lineTotal: usedDevices[0].suggestedRetailPrice,
          warehouseLocation: 'C-01'
        }],
        subtotal: usedDevices[0].suggestedRetailPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: usedDevices[0].suggestedRetailPrice,
        status: 'FINALIZED',
        createdBy: users[1]._id,
        createdAt: saleDate,
        finalizedAt: saleDate
      });
    }
    
    await SalesInvoice.insertMany(historicalInvoices);
    console.log(`✅ 创建了 ${historicalInvoices.length} 条历史销售记录`);

    // 创建示例采购订单
    console.log('📋 创建示例采购订单...');
    const purchaseOrder = await PurchaseOrder.create({
      orderNumber: 'PO-2024-0001',
      supplier: suppliers[0]._id,
      lineItems: [
        {
          productName: 'iPhone 15 Pro 保护壳',
          category: 'ACCESSORY',
          barcode: '8901234567890',
          quantity: 100,
          expectedUnitPrice: 15.00,
          lineTotal: 1500.00,
          taxClassification: 'VAT_23'
        }
      ],
      totalAmount: 1500.00,
      status: 'ORDERED',
      statusHistory: [
        {
          status: 'DRAFT',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          userId: users[0]._id
        },
        {
          status: 'SENT',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          userId: users[0]._id
        },
        {
          status: 'ORDERED',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          userId: users[0]._id
        }
      ],
      orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: users[0]._id
    });
    console.log(`✅ 创建了示例采购订单`);

    console.log('\n✨ 测试数据创建完成！');
    console.log('\n📊 数据统计:');
    console.log(`   - 供应商: ${suppliers.length}`);
    console.log(`   - 用户: ${users.length}`);
    console.log(`   - 配件产品: ${accessories.length}`);
    console.log(`   - 全新设备: ${newDevices.length}`);
    console.log(`   - 二手设备: ${usedDevices.length}`);
    console.log(`   - 销售发票: ${historicalInvoices.length + 1}`);
    console.log(`   - 采购订单: 1`);
    console.log('\n🔐 测试账号:');
    console.log('   管理员: admin / admin123');
    console.log('   仓管员: warehouse1 / warehouse123');
    console.log('   VIP商户: merchant_vip / merchant123');
    console.log('   Gold商户: merchant_gold / merchant123');
    console.log('   零售客户: customer1 / customer123');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
};

seedData();
