/**
 * 手动修复已退款的 iPhone 11 (111999)
 * 将其补回库存
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixRefundedIPhone11() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    
    // 1. 查找退款记录
    console.log('=== 查找退款记录 ===');
    const sale = await MerchantSale.findOne({
      'items.serialNumber': '111999',
      status: 'refunded'
    }).lean();
    
    if (!sale) {
      console.log('❌ 未找到退款记录');
      return;
    }
    
    console.log(`订单号: ${sale.saleId || sale._id}`);
    console.log(`退款日期: ${new Date(sale.refundDate).toLocaleString('zh-CN')}`);
    console.log(`退款金额: €${sale.refundAmount}`);
    console.log('');
    
    // 2. 查找退款项目
    const refundItem = sale.refundItems?.find(item => item.serialNumber === '111999');
    
    if (!refundItem) {
      console.log('❌ 未找到退款项目信息');
      return;
    }
    
    console.log('=== 退款项目信息 ===');
    console.log(`产品: ${refundItem.productName}`);
    console.log(`序列号: ${refundItem.serialNumber}`);
    console.log(`退款后状态: ${refundItem.deviceStatus}`);
    console.log(`退款后成色: ${refundItem.deviceCondition}`);
    console.log(`是否补回库存: ${refundItem.restock ? '是' : '否'}`);
    console.log('');
    
    if (!refundItem.restock) {
      console.log('⚠️  用户选择不补回库存，无需处理');
      return;
    }
    
    // 3. 查找库存记录
    console.log('=== 查找库存记录 ===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: '111999',
      merchantId: 'MurrayRanelagh'
    });
    
    if (!inventory) {
      console.log('❌ 未找到库存记录');
      return;
    }
    
    console.log(`当前状态:`);
    console.log(`  产品: ${inventory.productName}`);
    console.log(`  成色: ${inventory.condition}`);
    console.log(`  分类: ${inventory.category}`);
    console.log(`  数量: ${inventory.quantity}`);
    console.log(`  状态: ${inventory.status}`);
    console.log('');
    
    // 4. 更新库存
    console.log('=== 更新库存 ===');
    
    const oldCondition = inventory.condition;
    const oldCategory = inventory.category;
    const oldQuantity = inventory.quantity;
    const oldStatus = inventory.status;
    
    // 更新状态
    inventory.status = refundItem.deviceStatus === 'available' ? 'active' : 
                      refundItem.deviceStatus === 'damaged' ? 'damaged' : 'repairing';
    inventory.condition = refundItem.deviceCondition;
    inventory.quantity = 1;
    
    // 检查是否需要变更分类（全新变二手）
    const wasNew = refundItem.originalCondition === 'Brand New' || 
                  refundItem.originalCondition === '全新' || 
                  refundItem.originalCondition === 'BRAND NEW';
    const isNowUsed = refundItem.deviceCondition !== 'Brand New' && 
                    refundItem.deviceCondition !== '全新';
    
    if (wasNew && isNowUsed) {
      // 从全新变为二手，需要更新分类
      if (oldCategory && oldCategory.toLowerCase().includes('new')) {
        inventory.category = oldCategory.replace(/new/gi, 'Used');
      } else if (oldCategory && oldCategory.toLowerCase().includes('brand')) {
        inventory.category = oldCategory.replace(/brand/gi, 'Pre-Owned');
      } else {
        inventory.category = 'Pre-Owned Devices';
      }
      
      console.log(`📝 分类变更: ${oldCategory} → ${inventory.category}`);
    }
    
    await inventory.save();
    
    console.log('✅ 库存已更新:');
    console.log(`  成色: ${oldCondition} → ${inventory.condition}`);
    console.log(`  分类: ${oldCategory} → ${inventory.category}`);
    console.log(`  数量: ${oldQuantity} → ${inventory.quantity}`);
    console.log(`  状态: ${oldStatus} → ${inventory.status}`);
    console.log('');
    console.log('🎉 修复完成！设备已补回库存。');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

fixRefundedIPhone11();
