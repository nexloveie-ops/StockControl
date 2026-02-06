require('dotenv').config();
const mongoose = require('mongoose');

async function migrateVariants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查找所有批量创建的变体产品（merchantId为admin的配件产品）
    console.log('📦 查找需要迁移的变体产品...');
    const variantsToMigrate = await MerchantInventory.find({
      merchantId: 'admin',
      // 配件产品通常有model和color字段
      model: { $exists: true, $ne: '' },
      color: { $exists: true, $ne: '' }
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${variantsToMigrate.length} 个需要迁移的变体产品\n`);
    
    if (variantsToMigrate.length === 0) {
      console.log('没有需要迁移的数据');
      return;
    }
    
    // 显示将要迁移的产品
    console.log('将要迁移的产品：');
    const productGroups = {};
    variantsToMigrate.forEach(item => {
      if (!productGroups[item.productName]) {
        productGroups[item.productName] = 0;
      }
      productGroups[item.productName]++;
    });
    
    Object.entries(productGroups).forEach(([name, count]) => {
      console.log(`  - ${name}: ${count} 个变体`);
    });
    
    console.log('\n确认迁移？这将：');
    console.log('1. 将这些产品从 MerchantInventory 复制到 AdminInventory');
    console.log('2. 从 MerchantInventory 中删除这些记录');
    console.log('\n按 Ctrl+C 取消，或等待 5 秒后自动开始...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 开始迁移
    console.log('🚀 开始迁移...\n');
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const item of variantsToMigrate) {
      try {
        // 创建AdminInventory记录
        const adminItem = new AdminInventory({
          productName: item.productName,
          brand: item.brand || '',
          model: item.model || '',
          color: item.color || '',
          category: item.category,
          taxClassification: item.taxClassification || 'VAT_23',
          quantity: item.quantity || 0,
          costPrice: item.costPrice || 0,
          wholesalePrice: item.wholesalePrice || 0,
          retailPrice: item.retailPrice || 0,
          barcode: item.barcode || '',
          serialNumber: item.serialNumber || '',
          condition: item.condition || 'BRAND_NEW',
          source: 'batch', // 标记为批量创建
          status: 'AVAILABLE',
          salesStatus: 'UNSOLD',
          notes: item.notes || '',
          isActive: true,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
        
        await adminItem.save();
        
        // 删除MerchantInventory记录
        await MerchantInventory.deleteOne({ _id: item._id });
        
        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`  已迁移 ${migratedCount}/${variantsToMigrate.length} 个产品...`);
        }
      } catch (error) {
        console.error(`❌ 迁移失败: ${item.productName} (${item.model} - ${item.color})`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n✅ 迁移完成！');
    console.log(`   成功: ${migratedCount} 个`);
    console.log(`   失败: ${errorCount} 个`);
    
    // 验证迁移结果
    console.log('\n📊 验证迁移结果...');
    const adminCount = await AdminInventory.countDocuments();
    const merchantCount = await MerchantInventory.countDocuments({ merchantId: 'admin' });
    
    console.log(`   AdminInventory 总数: ${adminCount}`);
    console.log(`   MerchantInventory (admin) 剩余: ${merchantCount}`);
    
  } catch (error) {
    console.error('❌ 迁移过程出错:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

migrateVariants();
