const mongoose = require('mongoose');
require('dotenv').config();

async function syncSoldSerialsToAdminInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('🔄 开始同步已售序列号到 AdminInventory\n');
    console.log('='.repeat(80));
    
    // 1. 查找 ProductNew 中所有已售的序列号
    const allProducts = await ProductNew.find({
      'serialNumbers.status': 'sold'
    });
    
    const soldSerials = [];
    allProducts.forEach(product => {
      if (product.serialNumbers && product.serialNumbers.length > 0) {
        product.serialNumbers.forEach(sn => {
          if (sn.status === 'sold') {
            soldSerials.push(sn.serialNumber);
          }
        });
      }
    });
    
    console.log(`📋 找到 ${soldSerials.length} 个已售序列号\n`);
    
    if (soldSerials.length === 0) {
      console.log('✅ 没有需要同步的序列号');
      return;
    }
    
    // 2. 查找 AdminInventory 中对应的记录
    const adminRecords = await AdminInventory.find({
      serialNumber: { $in: soldSerials },
      isActive: true
    });
    
    console.log(`📦 AdminInventory 中找到 ${adminRecords.length} 条匹配记录\n`);
    
    // 3. 检查哪些记录需要更新
    const needUpdate = adminRecords.filter(record => 
      record.status === 'AVAILABLE' || record.quantity > 0
    );
    
    console.log(`🔧 需要更新 ${needUpdate.length} 条记录:\n`);
    
    needUpdate.forEach(record => {
      console.log(`  - ${record.productName} (序列号: ${record.serialNumber})`);
      console.log(`    当前状态: ${record.status}, 数量: ${record.quantity}`);
    });
    
    if (needUpdate.length === 0) {
      console.log('\n✅ 所有记录已同步，无需更新');
      return;
    }
    
    // 4. 执行批量更新
    console.log(`\n🔄 开始批量更新...`);
    
    const result = await AdminInventory.updateMany(
      {
        serialNumber: { $in: soldSerials },
        isActive: true
      },
      {
        $set: {
          status: 'SOLD',
          quantity: 0
        }
      }
    );
    
    console.log(`\n✅ 更新完成:`);
    console.log(`   匹配记录: ${result.matchedCount}`);
    console.log(`   修改记录: ${result.modifiedCount}`);
    
    // 5. 验证更新结果
    console.log(`\n🔍 验证更新结果...\n`);
    
    const stillAvailable = await AdminInventory.find({
      serialNumber: { $in: soldSerials },
      isActive: true,
      status: 'AVAILABLE'
    });
    
    if (stillAvailable.length > 0) {
      console.log(`⚠️  仍有 ${stillAvailable.length} 条记录状态为 AVAILABLE:`);
      stillAvailable.forEach(record => {
        console.log(`  - ${record.productName} (序列号: ${record.serialNumber})`);
      });
    } else {
      console.log(`✅ 所有已售序列号在 AdminInventory 中的状态已正确更新为 SOLD`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 同步完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

syncSoldSerialsToAdminInventory();
