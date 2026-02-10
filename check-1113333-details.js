/**
 * 检查序列号 1113333 的详细信息
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function check1113333Details() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找序列号 1113333（不限制商户）
    const inventory = await MerchantInventory.findOne({
      serialNumber: '1113333'
    }).lean();
    
    if (!inventory) {
      console.log('❌ 数据库中没有序列号 1113333 的记录');
      return;
    }
    
    console.log('=== 库存记录详情 ===');
    console.log(`产品名称: ${inventory.productName}`);
    console.log(`序列号: ${inventory.serialNumber}`);
    console.log(`商户ID: ${inventory.merchantId}`);
    console.log(`商户名称: ${inventory.merchantName}`);
    console.log(`店面组: ${inventory.storeGroup || '未设置'}`);
    console.log(`成色: ${inventory.condition}`);
    console.log(`分类: ${inventory.category}`);
    console.log(`数量: ${inventory.quantity}`);
    console.log(`状态: ${inventory.status}`);
    console.log(`isActive: ${inventory.isActive}`);
    console.log(`来源: ${inventory.source}`);
    console.log(`创建时间: ${new Date(inventory.createdAt).toLocaleString('zh-CN')}`);
    console.log(`更新时间: ${new Date(inventory.updatedAt).toLocaleString('zh-CN')}`);
    console.log('');
    
    // 检查为什么API没有返回
    console.log('=== 问题诊断 ===');
    
    if (inventory.merchantId !== 'MurrayRanelagh') {
      console.log(`❌ 商户不匹配: ${inventory.merchantId} !== MurrayRanelagh`);
      console.log('   这个库存属于其他商户，所以搜索不到');
    } else {
      console.log('✅ 商户匹配: MurrayRanelagh');
    }
    
    if (!inventory.isActive) {
      console.log('❌ isActive = false，库存已停用');
    } else {
      console.log('✅ isActive = true');
    }
    
    if (inventory.quantity === 0) {
      console.log('⚠️  数量为 0');
    } else {
      console.log(`✅ 数量: ${inventory.quantity}`);
    }
    
    if (inventory.status !== 'active') {
      console.log(`⚠️  状态: ${inventory.status} (不是 active)`);
    } else {
      console.log('✅ 状态: active');
    }
    
    // 检查API查询条件
    console.log('');
    console.log('=== API查询条件 ===');
    const apiQuery = {
      merchantId: 'MurrayRanelagh',
      isActive: true
    };
    console.log('API查询:', JSON.stringify(apiQuery, null, 2));
    
    const matchesQuery = 
      inventory.merchantId === apiQuery.merchantId &&
      inventory.isActive === apiQuery.isActive;
    
    if (matchesQuery) {
      console.log('✅ 符合API查询条件，应该被返回');
    } else {
      console.log('❌ 不符合API查询条件，所以没有被返回');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

check1113333Details();
