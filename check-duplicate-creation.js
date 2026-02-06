require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkDuplicateCreation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找所有 Data Cable USB-A TO MICRO 记录
    const records = await MerchantInventory.find({
      productName: 'Data Cable',
      model: 'USB-A TO MICRO'
    }).sort({ createdAt: 1 }).lean();
    
    console.log(`=== 找到 ${records.length} 条记录 ===\n`);
    
    records.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   创建时间: ${record.createdAt}`);
      console.log(`   更新时间: ${record.updatedAt}`);
      console.log(`   来源: ${record.source}`);
      console.log(`   来源订单ID: ${record.sourceOrderId || '无'}`);
      console.log(`   来源调货ID: ${record.sourceTransferId || '无'}`);
      console.log(`   序列号: ${record.serialNumber || '无'}`);
      console.log(`   条码: ${record.barcode || '无'}`);
      console.log(`   数量: ${record.quantity}`);
      console.log(`   成本价: €${record.costPrice}`);
      console.log(`   批发价: €${record.wholesalePrice}`);
      console.log(`   零售价: €${record.retailPrice}`);
      console.log(`   位置: ${record.location || '无'}`);
      console.log(`   备注: ${record.notes || '无'}`);
      console.log('');
    });
    
    // 检查是否来自同一个调货单
    const transferIds = [...new Set(records.map(r => r.sourceTransferId?.toString()).filter(Boolean))];
    console.log(`\n=== 来源分析 ===`);
    console.log(`不同的来源类型: ${[...new Set(records.map(r => r.source))].join(', ')}`);
    console.log(`不同的调货单数量: ${transferIds.length}`);
    
    if (transferIds.length > 0) {
      const InventoryTransfer = require('./models/InventoryTransfer');
      for (const transferId of transferIds) {
        const transfer = await InventoryTransfer.findById(transferId).lean();
        if (transfer) {
          console.log(`\n调货单: ${transfer.transferNumber}`);
          console.log(`  创建时间: ${transfer.createdAt}`);
          console.log(`  状态: ${transfer.status}`);
          console.log(`  产品数量: ${transfer.items?.length || 0}`);
          transfer.items?.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.productName} - 数量: ${item.quantity}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkDuplicateCreation();
