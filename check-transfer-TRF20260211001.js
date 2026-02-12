const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransfer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    const InventoryTransfer = require('./models/InventoryTransfer');

    // 查找订单
    const transfer = await InventoryTransfer.findOne({ transferNumber: 'TRF20260211001' });

    if (!transfer) {
      console.log('❌ 未找到订单 TRF20260211001');
      return;
    }

    console.log('=== 调货订单详情 ===');
    console.log('订单号:', transfer.transferNumber);
    console.log('状态:', transfer.status);
    console.log('调出方:', transfer.fromMerchantName, `(${transfer.fromMerchant})`);
    console.log('调入方:', transfer.toMerchantName, `(${transfer.toMerchant})`);
    console.log('创建时间:', transfer.createdAt);
    console.log('批准时间:', transfer.approvedAt);
    console.log('批准人:', transfer.approvedBy);
    console.log('批准备注:', transfer.approvalNotes);
    console.log('\n=== 产品列表 ===');
    
    transfer.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log('   - inventoryId:', item.inventoryId);
      console.log('   - 品牌:', item.brand || 'N/A');
      console.log('   - 型号:', item.model || 'N/A');
      console.log('   - 颜色:', item.color || 'N/A');
      console.log('   - 数量:', item.quantity);
      console.log('   - 序列号:', item.serialNumber || 'N/A');
      console.log('   - IMEI:', item.imei || 'N/A');
      console.log('   - 成色:', item.condition || 'N/A');
    });

    console.log('\n=== IMEI映射信息 ===');
    if (transfer.imeiMapping) {
      console.log('imeiMapping字段存在:');
      console.log(JSON.stringify(transfer.imeiMapping, null, 2));
    } else {
      console.log('❌ 没有imeiMapping字段');
    }

    console.log('\n=== 完整订单数据 ===');
    console.log(JSON.stringify(transfer.toObject(), null, 2));

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkTransfer();
