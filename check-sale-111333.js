/**
 * 检查序列号 111333 的销售记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkSale111333() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 查找库存记录
    console.log('=== 1. 查找库存记录 ===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: '111999'
    }).lean();
    
    if (inventory) {
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`序列号: ${inventory.serialNumber}`);
      console.log(`库存ID: ${inventory._id}`);
      console.log(`成色: ${inventory.condition}`);
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
        console.log(`  - 退回成色 (refundCondition): ${saleItem.refundCondition || '未设置'}`);
        console.log('');
      }
    });
    
    // 3. 分析问题
    console.log('=== 3. 问题分析 ===');
    const refundedSale = sales.find(s => s.status === 'refunded');
    if (refundedSale) {
      const saleItem = refundedSale.items.find(item => 
        item.inventoryId && item.inventoryId.toString() === inventory._id.toString()
      );
      
      if (saleItem) {
        console.log('退款记录中的成色字段:');
        console.log(`  refundCondition: ${saleItem.refundCondition || '❌ 未设置'}`);
        console.log(`  condition: ${saleItem.condition || '❌ 未设置'}`);
        console.log(`  originalCondition: ${saleItem.originalCondition || '❌ 未设置'}`);
        console.log('');
        
        if (!saleItem.refundCondition && !saleItem.condition && !saleItem.originalCondition) {
          console.log('⚠️  所有成色字段都未设置，所以显示"未知"');
        } else if (!saleItem.refundCondition) {
          console.log('⚠️  refundCondition 未设置，应该使用 condition 或 originalCondition');
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

checkSale111333();
