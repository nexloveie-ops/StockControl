/**
 * 修复序列号 1115555 的退款成色记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixRefundCondition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 查找库存记录，获取当前成色
    console.log('=== 1. 查找库存记录 ===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: '1115555'
    });
    
    if (!inventory) {
      console.log('❌ 没有找到库存记录');
      return;
    }
    
    console.log(`产品名称: ${inventory.productName}`);
    console.log(`序列号: ${inventory.serialNumber}`);
    console.log(`当前成色: ${inventory.condition}`);
    console.log('');
    
    // 2. 查找退款记录
    console.log('=== 2. 查找退款记录 ===');
    const sale = await MerchantSale.findOne({
      'items.inventoryId': inventory._id,
      status: 'refunded'
    });
    
    if (!sale) {
      console.log('❌ 没有找到退款记录');
      return;
    }
    
    console.log(`销售ID: ${sale._id}`);
    console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
    console.log('');
    
    // 3. 查找销售项目
    const saleItem = sale.items.find(item => 
      item.inventoryId && item.inventoryId.toString() === inventory._id.toString()
    );
    
    if (!saleItem) {
      console.log('❌ 没有找到销售项目');
      return;
    }
    
    console.log('=== 3. 修复前 ===');
    console.log(`refundCondition: ${saleItem.refundCondition || '未设置'}`);
    console.log(`condition: ${saleItem.condition || '未设置'}`);
    console.log(`originalCondition: ${saleItem.originalCondition || '未设置'}`);
    console.log('');
    
    // 4. 更新退回成色
    console.log('=== 4. 更新退回成色 ===');
    saleItem.refundCondition = inventory.condition; // 使用当前库存的成色
    await sale.save();
    
    console.log('=== 5. 修复后 ===');
    console.log(`refundCondition: ${saleItem.refundCondition}`);
    console.log('');
    console.log('✅ 退回成色已更新');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

fixRefundCondition();
