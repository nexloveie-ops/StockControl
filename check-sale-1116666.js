/**
 * 检查序列号 1116666 的销售和退款记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkSale1116666() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 查找库存记录
    console.log('=== 1. 查找库存记录 ===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: '1116666'
    }).lean();
    
    if (inventory) {
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`序列号: ${inventory.serialNumber}`);
      console.log(`库存ID: ${inventory._id}`);
      console.log(`当前成色: ${inventory.condition}`);
      console.log(`当前分类: ${inventory.category}`);
      console.log(`数量: ${inventory.quantity}`);
      console.log('');
    } else {
      console.log('❌ 没有找到库存记录');
      return;
    }
    
    // 2. 查找销售记录
    console.log('=== 2. 查找销售记录 ===');
    const sales = await MerchantSale.find({
      'items.inventoryId': inventory._id
    }).sort({ saleDate: -1 }).lean();
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`--- 销售记录 ${index + 1} ---`);
      console.log(`销售ID: ${sale._id}`);
      console.log(`状态: ${sale.status}`);
      console.log(`销售日期: ${new Date(sale.saleDate).toLocaleString('zh-CN')}`);
      console.log(`退款日期: ${sale.refundDate ? new Date(sale.refundDate).toLocaleString('zh-CN') : '无'}`);
      console.log(`退款原因: ${sale.refundReason || '无'}`);
      console.log('');
      
      // 查找该产品的销售项目
      const saleItem = sale.items.find(item => 
        item.inventoryId && item.inventoryId.toString() === inventory._id.toString()
      );
      
      if (saleItem) {
        console.log('  销售项目详情:');
        console.log(`  - 产品名称: ${saleItem.productName}`);
        console.log(`  - 序列号: ${saleItem.serialNumber}`);
        console.log(`  - 销售价格: €${saleItem.price}`);
        console.log(`  - 数量: ${saleItem.quantity}`);
        console.log(`  - 成色 (condition): ${saleItem.condition || '未设置'}`);
        console.log(`  - 原始成色 (originalCondition): ${saleItem.originalCondition || '未设置'}`);
        console.log(`  - 原始分类 (originalCategory): ${saleItem.originalCategory || '未设置'}`);
        console.log(`  - 退回成色 (refundCondition): ${saleItem.refundCondition || '未设置'}`);
        console.log('');
      }
    });
    
    // 3. 验证退款记录
    console.log('=== 3. 验证退款记录 ===');
    const refundedSale = sales.find(s => s.status === 'refunded');
    if (refundedSale) {
      const saleItem = refundedSale.items.find(item => 
        item.inventoryId && item.inventoryId.toString() === inventory._id.toString()
      );
      
      if (saleItem) {
        console.log('退款记录中的成色字段:');
        console.log(`  1. refundCondition: ${saleItem.refundCondition || '❌ 未设置'}`);
        console.log(`  2. condition: ${saleItem.condition || '❌ 未设置'}`);
        console.log(`  3. originalCondition: ${saleItem.originalCondition || '❌ 未设置'}`);
        console.log('');
        
        console.log('时间线显示逻辑:');
        const displayCondition = saleItem.refundCondition || saleItem.condition || saleItem.originalCondition || '未知';
        console.log(`  显示的成色: ${displayCondition}`);
        console.log('');
        
        console.log('当前库存的成色:');
        console.log(`  库存成色: ${inventory.condition}`);
        console.log(`  库存分类: ${inventory.category}`);
        console.log('');
        
        // 验证是否正确
        if (saleItem.refundCondition) {
          console.log(`✅ refundCondition 已设置: ${saleItem.refundCondition}`);
          
          if (saleItem.refundCondition === inventory.condition) {
            console.log(`✅ 退回成色与库存成色一致`);
          } else {
            console.log(`⚠️  退回成色 (${saleItem.refundCondition}) 与库存成色 (${inventory.condition}) 不一致`);
          }
          
          if (displayCondition === saleItem.refundCondition) {
            console.log(`✅ 时间线会正确显示: ${displayCondition}`);
          } else {
            console.log(`❌ 时间线显示错误: 应该显示 ${saleItem.refundCondition}，但会显示 ${displayCondition}`);
          }
        } else {
          console.log('❌ refundCondition 未设置');
          console.log(`⚠️  时间线会显示: ${displayCondition} (可能不正确)`);
        }
      }
    } else {
      console.log('❌ 没有找到退款记录');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkSale1116666();
