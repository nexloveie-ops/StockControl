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

    // 创建配件类产品（20个）
    console.log('📱 创建配件类产品...');
    const accessoryData = [
      // 保护壳系列 (5个)
      { name: 'iPhone 15 Pro 保护壳', type: '保护壳', barcode: '8901234567890', qty: 150, price: 15, retail: 39.99, wholesale: 25, loc: 'A-01' },
      { name: 'iPhone 15 保护壳', type: '保护壳', barcode: '8901234567895', qty: 180, price: 12, retail: 29.99, wholesale: 20, loc: 'A-01' },
      { name: 'Samsung S24 保护壳', type: '保护壳', barcode: '8901234567896', qty: 120, price: 13, retail: 34.99, wholesale: 22, loc: 'A-01' },
      { name: 'iPad Pro 保护套', type: '保护壳', barcode: '8901234567897', qty: 90, price: 20, retail: 59.99, wholesale: 38, loc: 'A-01' },
      { name: '通用手机壳', type: '保护壳', barcode: '8901234567898', qty: 200, price: 8, retail: 19.99, wholesale: 13, loc: 'A-01' },
      
      // 数据线系列 (6个)
      { name: 'USB-C 数据线 2米', type: '数据线', barcode: '8901234567891', qty: 300, price: 5, retail: 15.99, wholesale: 10, loc: 'A-02' },
      { name: 'USB-C 数据线 1米', type: '数据线', barcode: '8901234567893', qty: 250, price: 4, retail: 12.99, wholesale: 8, loc: 'A-02' },
      { name: 'Lightning 数据线 2米', type: '数据线', barcode: '8901234567899', qty: 280, price: 5.5, retail: 16.99, wholesale: 11, loc: 'A-02' },
      { name: 'Lightning 数据线 1米', type: '数据线', barcode: '8901234567900', qty: 220, price: 4.5, retail: 13.99, wholesale: 9, loc: 'A-02' },
      { name: 'Micro USB 数据线', type: '数据线', barcode: '8901234567901', qty: 150, price: 3, retail: 9.99, wholesale: 6, loc: 'A-02' },
      { name: 'USB-C to Lightning 数据线', type: '数据线', barcode: '8901234567902', qty: 180, price: 6, retail: 18.99, wholesale: 12, loc: 'A-02' },
      
      // 充电器系列 (5个)
      { name: '无线充电器 15W', type: '充电器', barcode: '8901234567892', qty: 80, price: 25, retail: 69.99, wholesale: 45, loc: 'A-03' },
      { name: '快充充电器 20W', type: '充电器', barcode: '8901234567894', qty: 120, price: 18, retail: 49.99, wholesale: 32, loc: 'A-03' },
      { name: '快充充电器 30W', type: '充电器', barcode: '8901234567903', qty: 100, price: 22, retail: 59.99, wholesale: 38, loc: 'A-03' },
      { name: '车载充电器 双口', type: '充电器', barcode: '8901234567904', qty: 90, price: 15, retail: 39.99, wholesale: 26, loc: 'A-03' },
      { name: '多口充电器 4口', type: '充电器', barcode: '8901234567905', qty: 70, price: 28, retail: 79.99, wholesale: 52, loc: 'A-03' },
      
      // 其他配件 (4个)
      { name: '钢化膜 iPhone 15', type: '屏幕保护膜', barcode: '8901234567906', qty: 200, price: 3, retail: 12.99, wholesale: 8, loc: 'A-04' },
      { name: '钢化膜 Samsung S24', type: '屏幕保护膜', barcode: '8901234567907', qty: 180, price: 3, retail: 12.99, wholesale: 8, loc: 'A-04' },
      { name: '蓝牙耳机', type: '耳机', barcode: '8901234567908', qty: 60, price: 35, retail: 89.99, wholesale: 58, loc: 'A-05' },
      { name: '有线耳机 USB-C', type: '耳机', barcode: '8901234567909', qty: 150, price: 12, retail: 29.99, wholesale: 19, loc: 'A-05' }
    ];
    
    const accessories = await Product3C.insertMany(
      accessoryData.map(item => ({
        name: item.name,
        productType: item.type,
        category: 'ACCESSORY',
        barcode: item.barcode,
        quantity: item.qty,
        purchasePrice: item.price,
        purchaseTax: item.price * 0.23,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: item.retail,
        wholesalePrice: item.wholesale,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: item.wholesale * 0.88 },
          { tierName: 'Gold', tierLevel: 2, price: item.wholesale * 0.96 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: item.loc,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)]._id,
        salesStatus: 'UNSOLD',
        procurementDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000)
      }))
    );
    console.log(`✅ 创建了 ${accessories.length} 个配件产品`);

    // 创建全新设备（15个）
    console.log('📱 创建全新设备...');
    const newDeviceData = [
      // iPhone 系列 (6个)
      { name: 'iPhone 15 Pro 256GB', type: 'iPhone 15 Pro 256GB', sn: 'SN1501', price: 800, retail: 1299.99, wholesale: 1100, loc: 'B-01' },
      { name: 'iPhone 15 Pro 256GB', type: 'iPhone 15 Pro 256GB', sn: 'SN1502', price: 800, retail: 1299.99, wholesale: 1100, loc: 'B-01' },
      { name: 'iPhone 15 128GB', type: 'iPhone 15 128GB', sn: 'SN1503', price: 650, retail: 999.99, wholesale: 850, loc: 'B-01' },
      { name: 'iPhone 15 128GB', type: 'iPhone 15 128GB', sn: 'SN1504', price: 650, retail: 999.99, wholesale: 850, loc: 'B-01' },
      { name: 'iPhone 14 Pro 128GB', type: 'iPhone 14 Pro 128GB', sn: 'SN1401', price: 700, retail: 1099.99, wholesale: 950, loc: 'B-02' },
      { name: 'iPhone 14 128GB', type: 'iPhone 14 128GB', sn: 'SN1402', price: 550, retail: 849.99, wholesale: 720, loc: 'B-02' },
      
      // Samsung 系列 (4个)
      { name: 'Samsung Galaxy S24 Ultra 512GB', type: 'Samsung Galaxy S24 Ultra 512GB', sn: 'SN2401', price: 900, retail: 1499.99, wholesale: 1250, loc: 'B-03' },
      { name: 'Samsung Galaxy S24 256GB', type: 'Samsung Galaxy S24 256GB', sn: 'SN2402', price: 700, retail: 1099.99, wholesale: 950, loc: 'B-03' },
      { name: 'Samsung Galaxy S23 256GB', type: 'Samsung Galaxy S23 256GB', sn: 'SN2301', price: 600, retail: 949.99, wholesale: 800, loc: 'B-03' },
      { name: 'Samsung Galaxy A54 128GB', type: 'Samsung Galaxy A54 128GB', sn: 'SN2501', price: 300, retail: 499.99, wholesale: 420, loc: 'B-04' },
      
      // MacBook/iPad 系列 (5个)
      { name: 'MacBook Pro 14" M3', type: 'MacBook Pro 14" M3', sn: 'SN3001', price: 1500, retail: 2299.99, wholesale: 1950, loc: 'B-05' },
      { name: 'MacBook Air 13" M2', type: 'MacBook Air 13" M2', sn: 'SN3002', price: 900, retail: 1399.99, wholesale: 1180, loc: 'B-05' },
      { name: 'iPad Pro 12.9" 256GB', type: 'iPad Pro 12.9" 256GB', sn: 'SN3101', price: 800, retail: 1249.99, wholesale: 1050, loc: 'B-06' },
      { name: 'iPad Air 10.9" 128GB', type: 'iPad Air 10.9" 128GB', sn: 'SN3102', price: 450, retail: 699.99, wholesale: 590, loc: 'B-06' },
      { name: 'iPad 10.2" 64GB', type: 'iPad 10.2" 64GB', sn: 'SN3103', price: 280, retail: 449.99, wholesale: 380, loc: 'B-06' }
    ];
    
    const newDevices = await Product3C.insertMany(
      newDeviceData.map(item => ({
        name: item.name,
        productType: item.type,
        category: 'NEW_DEVICE',
        serialNumber: item.sn,
        deviceType: 'NEW',
        purchasePrice: item.price,
        purchaseTax: item.price * 0.23,
        taxClassification: 'VAT_23',
        suggestedRetailPrice: item.retail,
        wholesalePrice: item.wholesale,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: item.wholesale * 0.95 },
          { tierName: 'Gold', tierLevel: 2, price: item.wholesale * 0.98 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: item.loc,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)]._id,
        salesStatus: 'UNSOLD',
        procurementDate: new Date(Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000)
      }))
    );
    console.log(`✅ 创建了 ${newDevices.length} 个全新设备`);

    // 创建二手设备（15个）
    console.log('📱 创建二手设备...');
    const usedDeviceData = [
      // iPhone 二手 (7个)
      { name: 'iPhone 13 Pro 128GB (二手 A+)', type: 'iPhone 13 Pro 128GB', sn: 'IMEI1301', grade: 'A_PLUS', price: 400, tax: 0, taxType: 'MARGIN_VAT_0', retail: 699.99, wholesale: 580, loc: 'C-01' },
      { name: 'iPhone 13 Pro 128GB (二手 A)', type: 'iPhone 13 Pro 128GB', sn: 'IMEI1302', grade: 'A', price: 380, tax: 0, taxType: 'MARGIN_VAT_0', retail: 649.99, wholesale: 550, loc: 'C-01' },
      { name: 'iPhone 13 Pro 128GB (二手 A)', type: 'iPhone 13 Pro 128GB', sn: 'IMEI1303', grade: 'A', price: 380, tax: 0, taxType: 'MARGIN_VAT_0', retail: 649.99, wholesale: 550, loc: 'C-01' },
      { name: 'iPhone 12 Pro 128GB (二手 A)', type: 'iPhone 12 Pro 128GB', sn: 'IMEI1201', grade: 'A', price: 320, tax: 73.6, taxType: 'VAT_23', retail: 549.99, wholesale: 460, loc: 'C-02' },
      { name: 'iPhone 12 64GB (二手 B)', type: 'iPhone 12 64GB', sn: 'IMEI1202', grade: 'B', price: 250, tax: 0, taxType: 'MARGIN_VAT_0', retail: 449.99, wholesale: 380, loc: 'C-02' },
      { name: 'iPhone 11 128GB (二手 A)', type: 'iPhone 11 128GB', sn: 'IMEI1101', grade: 'A', price: 220, tax: 50.6, taxType: 'VAT_23', retail: 399.99, wholesale: 330, loc: 'C-02' },
      { name: 'iPhone 11 64GB (二手 B)', type: 'iPhone 11 64GB', sn: 'IMEI1102', grade: 'B', price: 180, tax: 0, taxType: 'MARGIN_VAT_0', retail: 329.99, wholesale: 280, loc: 'C-02' },
      
      // Samsung 二手 (4个)
      { name: 'Samsung Galaxy S22 256GB (二手 A)', type: 'Samsung Galaxy S22 256GB', sn: 'IMEI2201', grade: 'A', price: 300, tax: 69, taxType: 'VAT_23', retail: 549.99, wholesale: 450, loc: 'C-03' },
      { name: 'Samsung Galaxy S22 128GB (二手 A)', type: 'Samsung Galaxy S22 128GB', sn: 'IMEI2202', grade: 'A', price: 280, tax: 0, taxType: 'MARGIN_VAT_0', retail: 499.99, wholesale: 420, loc: 'C-03' },
      { name: 'Samsung Galaxy S21 128GB (二手 B)', type: 'Samsung Galaxy S21 128GB', sn: 'IMEI2101', grade: 'B', price: 220, tax: 50.6, taxType: 'VAT_23', retail: 399.99, wholesale: 330, loc: 'C-03' },
      { name: 'Samsung Galaxy A52 128GB (二手 A)', type: 'Samsung Galaxy A52 128GB', sn: 'IMEI2501', grade: 'A', price: 150, tax: 0, taxType: 'MARGIN_VAT_0', retail: 279.99, wholesale: 230, loc: 'C-04' },
      
      // iPad 二手 (4个)
      { name: 'iPad Air 64GB (二手 B)', type: 'iPad Air 64GB', sn: 'IMEI3201', grade: 'B', price: 200, tax: 0, taxType: 'MARGIN_VAT_0', retail: 399.99, wholesale: 320, loc: 'C-05' },
      { name: 'iPad Air 64GB (二手 A)', type: 'iPad Air 64GB', sn: 'IMEI3202', grade: 'A', price: 230, tax: 52.9, taxType: 'VAT_23', retail: 449.99, wholesale: 360, loc: 'C-05' },
      { name: 'iPad 9th Gen 64GB (二手 A)', type: 'iPad 9th Gen 64GB', sn: 'IMEI3101', grade: 'A', price: 180, tax: 0, taxType: 'MARGIN_VAT_0', retail: 329.99, wholesale: 270, loc: 'C-05' },
      { name: 'iPad 9th Gen 64GB (二手 B)', type: 'iPad 9th Gen 64GB', sn: 'IMEI3102', grade: 'B', price: 150, tax: 34.5, taxType: 'VAT_23', retail: 279.99, wholesale: 230, loc: 'C-05' }
    ];
    
    const usedDevices = await Product3C.insertMany(
      usedDeviceData.map(item => ({
        name: item.name,
        productType: item.type,
        category: 'USED_DEVICE',
        serialNumber: item.sn,
        deviceType: 'USED',
        conditionGrade: item.grade,
        purchasePrice: item.price,
        purchaseTax: item.tax,
        taxClassification: item.taxType,
        suggestedRetailPrice: item.retail,
        wholesalePrice: item.wholesale,
        tierPricing: [
          { tierName: 'VIP', tierLevel: 1, price: item.wholesale * 0.95 },
          { tierName: 'Gold', tierLevel: 2, price: item.wholesale * 0.98 }
        ],
        status: 'AVAILABLE',
        warehouseLocation: item.loc,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)]._id,
        salesStatus: 'UNSOLD',
        procurementDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
      }))
    );
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
    console.log(`   - 总产品数: ${accessories.length + newDevices.length + usedDevices.length}`);
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
