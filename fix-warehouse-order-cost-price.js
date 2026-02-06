// 修正仓库调货的成本价
// 将商户库存中来源为仓库的产品，成本价更新为批发价

require('dotenv').config();
const mongoose = require('mongoose');
const MerchantInventory = require('./models/MerchantInventory');

async function fixWarehouseOrderCostPrice() {
  try {
    console.log('🔄 开始修正仓库调货成本价...\n');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查找所有来源为仓库的库存记录
    const inventories = await MerchantInventory.find({
      source: 'warehouse'
    }).sort({ createdAt: -1 });
    
    console.log(`📊 找到 ${inventories.length} 条仓库调货记录\n`);
    
    if (inventories.length === 0) {
      console.log('没有需要处理的记录');
      await mongoose.disconnect();
      return;
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];
    
    for (const inventory of inventories) {
      // 如果成本价不等于批发价，则需要更新
      if (inventory.costPrice !== inventory.wholesalePrice) {
        const oldCostPrice = inventory.costPrice;
        const newCostPrice = inventory.wholesalePrice;
        const difference = newCostPrice - oldCostPrice;
        
        updates.push({
          id: inventory._id,
          productName: inventory.productName,
          serialNumber: inventory.serialNumber || inventory.imei || 'N/A',
          merchantId: inventory.merchantId,
          oldCostPrice: oldCostPrice.toFixed(2),
          newCostPrice: newCostPrice.toFixed(2),
          difference: difference.toFixed(2),
          createdAt: inventory.createdAt
        });
        
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    // 显示需要更新的记录
    if (updates.length > 0) {
      console.log('📋 需要更新的记录：\n');
      console.log('序号 | 产品名称 | 序列号 | 商户 | 旧成本价 | 新成本价 | 差额 | 入库时间');
      console.log('-'.repeat(120));
      
      updates.forEach((update, index) => {
        console.log(
          `${(index + 1).toString().padEnd(4)} | ` +
          `${update.productName.substring(0, 20).padEnd(20)} | ` +
          `${update.serialNumber.substring(0, 15).padEnd(15)} | ` +
          `${update.merchantId.padEnd(15)} | ` +
          `€${update.oldCostPrice.padStart(8)} | ` +
          `€${update.newCostPrice.padStart(8)} | ` +
          `€${update.difference.padStart(8)} | ` +
          `${new Date(update.createdAt).toLocaleDateString('zh-CN')}`
        );
      });
      
      console.log('\n');
      console.log(`📊 统计：`);
      console.log(`   需要更新: ${updatedCount} 条`);
      console.log(`   已经正确: ${skippedCount} 条`);
      console.log(`   总计: ${inventories.length} 条\n`);
      
      // 询问是否继续
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('是否继续更新？(yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ 取消更新');
        await mongoose.disconnect();
        return;
      }
      
      // 执行更新
      console.log('\n🔄 开始更新...\n');
      
      for (const update of updates) {
        const inventory = await MerchantInventory.findById(update.id);
        if (inventory) {
          inventory.costPrice = inventory.wholesalePrice;
          await inventory.save();
          console.log(`✅ 更新 ${update.productName} (${update.serialNumber})`);
        }
      }
      
      console.log(`\n✅ 完成！成功更新了 ${updatedCount} 条记录`);
      
    } else {
      console.log('✅ 所有记录的成本价都已正确，无需更新');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 运行脚本
fixWarehouseOrderCostPrice();
