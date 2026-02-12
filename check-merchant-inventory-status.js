// 检查各商户的库存状态
require('dotenv').config();
const mongoose = require('mongoose');

async function checkInventoryStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const MerchantInventory = require('./models/MerchantInventory');
    const UserNew = require('./models/UserNew');

    // 获取所有商户
    const merchants = await UserNew.find({ 
      role: { $in: ['retail_user', 'wholesale_user'] } 
    }).select('username role retailInfo');

    console.log('📊 商户库存详情:\n');

    for (const merchant of merchants) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`商户: ${merchant.username}`);
      console.log(`角色: ${merchant.role}`);
      console.log(`店面组: ${merchant.retailInfo?.storeGroup || '未设置'}`);
      console.log(`${'='.repeat(60)}`);

      // 获取该商户的所有库存
      const inventory = await MerchantInventory.find({ 
        merchantId: merchant.username 
      }).sort({ productName: 1 });

      if (inventory.length === 0) {
        console.log('  ❌ 无库存');
        continue;
      }

      console.log(`\n  总记录数: ${inventory.length}`);

      // 按分类统计
      const byCategory = {};
      inventory.forEach(item => {
        const cat = item.category || '未分类';
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, qty: 0, items: [] };
        }
        byCategory[cat].count++;
        byCategory[cat].qty += item.quantity;
        byCategory[cat].items.push(item);
      });

      console.log('\n  按分类统计:');
      for (const [category, data] of Object.entries(byCategory)) {
        console.log(`    ${category}: ${data.count} 种产品, ${data.qty} 件库存`);
      }

      // 显示设备（有序列号/IMEI的产品）
      const devices = inventory.filter(item => item.serialNumber || item.imei);
      if (devices.length > 0) {
        console.log(`\n  📱 设备 (${devices.length} 件):`);
        devices.forEach(item => {
          const serial = item.serialNumber || item.imei;
          console.log(`    - ${item.productName} ${item.model || ''} ${item.color || ''}`);
          console.log(`      SN/IMEI: ${serial}`);
          console.log(`      成色: ${item.condition || 'N/A'}`);
          console.log(`      状态: ${item.status}`);
          console.log(`      批发价: €${item.wholesalePrice.toFixed(2)}`);
        });
      }

      // 显示配件（没有序列号的产品）
      const accessories = inventory.filter(item => !item.serialNumber && !item.imei);
      if (accessories.length > 0) {
        console.log(`\n  🔌 配件 (${accessories.length} 种):`);
        
        // 合并相同产品
        const grouped = {};
        accessories.forEach(item => {
          const key = `${item.productName}_${item.model || ''}_${item.color || ''}`;
          if (!grouped[key]) {
            grouped[key] = {
              productName: item.productName,
              model: item.model,
              color: item.color,
              quantity: 0,
              wholesalePrice: item.wholesalePrice,
              records: []
            };
          }
          grouped[key].quantity += item.quantity;
          grouped[key].records.push(item);
        });

        for (const [key, data] of Object.entries(grouped)) {
          console.log(`    - ${data.productName} ${data.model || ''} ${data.color || ''}`);
          console.log(`      数量: ${data.quantity} 件`);
          console.log(`      批发价: €${data.wholesalePrice.toFixed(2)}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('\n✅ 检查完成！');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkInventoryStatus();
