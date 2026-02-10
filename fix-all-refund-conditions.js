/**
 * 批量修复所有退款记录的 refundCondition 字段
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllRefundConditions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找所有已退款的销售记录
    const refundedSales = await MerchantSale.find({
      status: 'refunded'
    }).sort({ refundDate: -1 });
    
    console.log(`找到 ${refundedSales.length} 条退款记录\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const sale of refundedSales) {
      console.log(`\n--- 处理销售记录 ${sale._id} ---`);
      console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
      
      let saleModified = false;
      
      for (const item of sale.items) {
        // 只处理有序列号的设备
        if (item.serialNumber) {
          console.log(`\n  商品: ${item.productName} (${item.serialNumber})`);
          console.log(`    当前 refundCondition: ${item.refundCondition || '未设置'}`);
          
          // 如果已经有 refundCondition，跳过
          if (item.refundCondition) {
            console.log(`    ✅ 已有退回成色，跳过`);
            skippedCount++;
            continue;
          }
          
          // 查找库存记录
          const inventory = await MerchantInventory.findOne({
            serialNumber: item.serialNumber
          });
          
          if (inventory) {
            console.log(`    找到库存记录，当前成色: ${inventory.condition}`);
            
            // 设置退回成色
            item.refundCondition = inventory.condition;
            saleModified = true;
            fixedCount++;
            
            console.log(`    ✅ 设置 refundCondition = ${inventory.condition}`);
          } else {
            console.log(`    ⚠️  未找到库存记录，无法修复`);
          }
        }
      }
      
      // 如果有修改，保存销售记录
      if (saleModified) {
        await sale.save();
        console.log(`  💾 销售记录已保存`);
      }
    }
    
    console.log(`\n\n=== 修复完成 ===`);
    console.log(`✅ 已修复: ${fixedCount} 条记录`);
    console.log(`⏭️  已跳过: ${skippedCount} 条记录（已有退回成色）`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

fixAllRefundConditions();
