/**
 * 为测试用户创建库存数据
 * 用于测试数据隔离功能
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function createTestInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    console.log('开始创建测试库存数据...\n');
    
    // 为 MurrayRanelagh 创建库存
    console.log('📦 为 MurrayRanelagh 创建库存...');
    const ranelagh1 = await MerchantInventory.create({
      merchantId: 'MurrayRanelagh',
      merchantName: 'Murray Ranelagh',
      productName: 'iPhone 13 Pro',
      brand: 'Apple',
      model: '13 Pro',
      category: '手机',
      serialNumber: 'RAN001',
      barcode: 'RAN001',
      color: 'Graphite',
      costPrice: 800,
      wholesalePrice: 900,
      retailPrice: 1000,
      quantity: 1,
      condition: 'BRAND_NEW',
      taxClassification: 'VAT_23',
      source: 'manual',
      status: 'active',
      isActive: true,
      notes: 'Ranelagh 店铺库存'
    });
    console.log(`  ✅ ${ranelagh1.productName} (${ranelagh1.serialNumber})`);
    
    const ranelagh2 = await MerchantInventory.create({
      merchantId: 'MurrayRanelagh',
      merchantName: 'Murray Ranelagh',
      productName: 'iPad Air',
      brand: 'Apple',
      model: 'Air 5th Gen',
      category: '平板',
      serialNumber: 'RAN002',
      barcode: 'RAN002',
      color: 'Space Gray',
      costPrice: 500,
      wholesalePrice: 600,
      retailPrice: 700,
      quantity: 1,
      condition: 'BRAND_NEW',
      taxClassification: 'VAT_23',
      source: 'manual',
      status: 'active',
      isActive: true,
      notes: 'Ranelagh 店铺库存'
    });
    console.log(`  ✅ ${ranelagh2.productName} (${ranelagh2.serialNumber})`);
    
    // 为 MurrayDundrum 创建库存
    console.log('\n📦 为 MurrayDundrum 创建库存...');
    const dundrum1 = await MerchantInventory.create({
      merchantId: 'MurrayDundrum',
      merchantName: 'Murray Dundrum',
      productName: 'Samsung Galaxy S22',
      brand: 'Samsung',
      model: 'Galaxy S22',
      category: '手机',
      serialNumber: 'DUN001',
      barcode: 'DUN001',
      color: 'Phantom Black',
      costPrice: 700,
      wholesalePrice: 800,
      retailPrice: 900,
      quantity: 1,
      condition: 'BRAND_NEW',
      taxClassification: 'VAT_23',
      source: 'manual',
      status: 'active',
      isActive: true,
      notes: 'Dundrum 店铺库存'
    });
    console.log(`  ✅ ${dundrum1.productName} (${dundrum1.serialNumber})`);
    
    const dundrum2 = await MerchantInventory.create({
      merchantId: 'MurrayDundrum',
      merchantName: 'Murray Dundrum',
      productName: 'MacBook Air M2',
      brand: 'Apple',
      model: 'MacBook Air M2',
      category: '笔记本',
      serialNumber: 'DUN002',
      barcode: 'DUN002',
      color: 'Midnight',
      costPrice: 1000,
      wholesalePrice: 1100,
      retailPrice: 1200,
      quantity: 1,
      condition: 'BRAND_NEW',
      taxClassification: 'VAT_23',
      source: 'manual',
      status: 'active',
      isActive: true,
      notes: 'Dundrum 店铺库存'
    });
    console.log(`  ✅ ${dundrum2.productName} (${dundrum2.serialNumber})`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试数据创建成功！');
    console.log('='.repeat(60));
    console.log('\n测试数据汇总:');
    console.log('  MurrayRanelagh: 2 个产品');
    console.log('    - iPhone 13 Pro (RAN001)');
    console.log('    - iPad Air (RAN002)');
    console.log('\n  MurrayDundrum: 2 个产品');
    console.log('    - Samsung Galaxy S22 (DUN001)');
    console.log('    - MacBook Air M2 (DUN002)');
    console.log('\n现在可以测试数据隔离功能了！');
    console.log('1. 使用 MurrayRanelagh 登录，应该只看到 2 个产品');
    console.log('2. 使用 MurrayDundrum 登录，应该只看到 2 个产品');
    console.log('3. 两个用户看到的产品应该不同\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
    process.exit(1);
  }
}

createTestInventory();
