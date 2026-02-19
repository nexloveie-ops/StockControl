const mongoose = require('mongoose');
require('dotenv').config();

async function fixAdminInventorySoldSerials() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('🔍 查找所有已售序列号...\n');
    
    // 查找所有有序列号的ProductNew产品
    const products = await ProductNew.find({
      'serialNumbers.0': { $exists: true }
    });
    
    console.log(`📦 找到 ${products.length} 个有序列号的产品\n`);
    
    let totalSoldSerials = 0;
    let totalUpdated = 0;
    
    for (const product of products) {
      const soldSerials = product.serialNumbers.filter(sn => sn.status === 'sold');
      
      if (soldSerials.length > 0) {
        console.log(`\n产品: ${product.name} (${product.color})`);
        console.log(`  已售序列号: ${soldSerials.length} 个`);
        
        totalSoldSerials += soldSerials.length;
        
        for (const sn of soldSerials) {
          // 查找AdminInventory中对应的记录
          const adminItems = await AdminInventory.find({
            serialNumber: sn.serialNumber,
            isActive: true
          });
          
          if (adminItems.length > 0) {
            console.log(`  序列号 ${sn.serialNumber}:`);
            console.log(`    AdminInventory中找到 ${adminItems.length} 条记录`);
            
            for (const item of adminItems) {
              if (item.status !== 'SOLD' || item.quantity !== 0) {
                console.log(`      更新记录 ${item._id}: status=${item.status} → SOLD, quantity=${item.quantity} → 0`);
                
                item.status = 'SOLD';
                item.quantity = 0;
                await item.save();
                
                totalUpdated++;
              } else {
                console.log(`      记录 ${item._id} 已经是SOLD状态，跳过`);
              }
            }
          }
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ 修复完成:`);
    console.log(`   总已售序列号: ${totalSoldSerials} 个`);
    console.log(`   更新AdminInventory记录: ${totalUpdated} 条`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdminInventorySoldSerials();
