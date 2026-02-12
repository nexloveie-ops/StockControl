const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransferTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const MerchantInventory = require('./models/MerchantInventory');
    const InventoryTransfer = require('./models/InventoryTransfer');

    // 1. 检查MurrayRanelagh的设备库存（有IMEI/序列号）
    console.log('=== 1. MurrayRanelagh的设备库存 ===');
    const murrayRanelaghDevices = await MerchantInventory.find({
      merchantId: 'merchant_001',
      status: 'active',
      quantity: { $gt: 0 },
      $or: [
        { serialNumber: { $exists: true, $ne: null, $ne: '' } },
        { imei: { $exists: true, $ne: null, $ne: '' } }
      ]
    }).sort({ productName: 1 });

    console.log(`找到 ${murrayRanelaghDevices.length} 个设备\n`);
    
    murrayRanelaghDevices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.productName}`);
      console.log(`   - ID: ${device._id}`);
      console.log(`   - 品牌: ${device.brand || 'N/A'}`);
      console.log(`   - 型号: ${device.model || 'N/A'}`);
      console.log(`   - 颜色: ${device.color || 'N/A'}`);
      console.log(`   - 序列号: ${device.serialNumber || 'N/A'}`);
      console.log(`   - IMEI: ${device.imei || 'N/A'}`);
      console.log(`   - 成色: ${device.condition || 'N/A'}`);
      console.log(`   - 数量: ${device.quantity}`);
      console.log('');
    });

    // 2. 检查待审批的调货订单
    console.log('=== 2. 待审批的调货订单 ===');
    const pendingTransfers = await InventoryTransfer.find({
      status: 'pending'
    }).sort({ createdAt: -1 });

    console.log(`找到 ${pendingTransfers.length} 个待审批订单\n`);
    
    pendingTransfers.forEach((transfer, index) => {
      console.log(`${index + 1}. ${transfer.transferNumber}`);
      console.log(`   - ID: ${transfer._id}`);
      console.log(`   - 调出方: ${transfer.fromMerchantName} (${transfer.fromMerchant})`);
      console.log(`   - 调入方: ${transfer.toMerchantName} (${transfer.toMerchant})`);
      console.log(`   - 状态: ${transfer.status}`);
      console.log(`   - 产品数量: ${transfer.items.length}`);
      console.log('   - 产品列表:');
      transfer.items.forEach((item, i) => {
        console.log(`     ${i + 1}. ${item.productName}`);
        console.log(`        - inventoryId: ${item.inventoryId}`);
        console.log(`        - 品牌: ${item.brand || 'N/A'}`);
        console.log(`        - 型号: ${item.model || 'N/A'}`);
        console.log(`        - 数量: ${item.quantity}`);
      });
      console.log('');
    });

    // 3. 测试查询逻辑
    if (pendingTransfers.length > 0) {
      console.log('=== 3. 测试查询逻辑 ===');
      const testTransfer = pendingTransfers[0];
      console.log(`测试订单: ${testTransfer.transferNumber}\n`);

      for (const item of testTransfer.items) {
        console.log(`产品: ${item.productName}`);
        
        // 模拟前端查询
        const queryResult = await MerchantInventory.find({
          merchantId: testTransfer.fromMerchant,
          productName: new RegExp(item.productName, 'i'),
          status: 'active',
          quantity: { $gt: 0 },
          $or: [
            { serialNumber: { $exists: true, $ne: null, $ne: '' } },
            { imei: { $exists: true, $ne: null, $ne: '' } }
          ]
        });

        console.log(`  查询条件:`);
        console.log(`    - merchantId: ${testTransfer.fromMerchant}`);
        console.log(`    - productName: ${item.productName}`);
        console.log(`  查询结果: 找到 ${queryResult.length} 个设备`);
        
        queryResult.forEach((device, i) => {
          console.log(`    ${i + 1}. ${device.serialNumber || device.imei}`);
          console.log(`       - 成色: ${device.condition || 'N/A'}`);
          console.log(`       - 型号: ${device.model || 'N/A'}`);
          console.log(`       - 颜色: ${device.color || 'N/A'}`);
        });
        console.log('');
      }
    }

    console.log('=== 检查完成 ===');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkTransferTestData();
