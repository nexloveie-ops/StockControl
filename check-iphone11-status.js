/**
 * 检查 iPhone 11 (序列号 111999) 的状态
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkIPhone11Status() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const MerchantSale = require('./models/MerchantSale');
    
    // 1. 查询 iPhone 11 (111999) 的库存记录
    console.log('=== 查询 iPhone 11 (111999) 库存 ===');
    const inventory = await MerchantInventory.findOne({
      serialNumber: '111999',
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    if (inventory) {
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`序列号: ${inventory.serialNumber}`);
      console.log(`成色: ${inventory.condition}`);
      console.log(`分类: ${inventory.category}`);
      console.log(`数量: ${inventory.quantity}`);
      console.log(`状态 (status): ${inventory.status}`);
      console.log(`销售状态 (salesStatus): ${inventory.salesStatus || '未设置'}`);
      console.log(`库存ID: ${inventory._id}`);
      console.log(`创建时间: ${new Date(inventory.createdAt).toLocaleString('zh-CN')}`);
      console.log(`更新时间: ${new Date(inventory.updatedAt).toLocaleString('zh-CN')}`);
    } else {
      console.log('❌ 未找到库存记录');
    }
    
    console.log('');
    
    // 2. 查询包含这个设备的销售记录
    console.log('=== 查询包含此设备的销售记录 ===');
    const sales = await MerchantSale.find({
      'items.serialNumber': '111999',
      merchantId: 'MurrayRanelagh'
    }).sort({ createdAt: -1 }).lean();
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`销售记录 ${index + 1}:`);
      console.log(`  订单号: ${sale.saleId || sale._id}`);
      console.log(`  创建时间: ${new Date(sale.createdAt).toLocaleString('zh-CN')}`);
      console.log(`  状态: ${sale.status || 'active'}`);
      console.log(`  退款状态: ${sale.refundDate ? '已退款' : '未退款'}`);
      console.log(`  退款日期: ${sale.refundDate ? new Date(sale.refundDate).toLocaleString('zh-CN') : '无'}`);
      console.log(`  退款金额: ${sale.refundAmount ? '€' + sale.refundAmount : '无'}`);
      
      // 查找包含此设备的商品
      const deviceItem = sale.items.find(item => item.serialNumber === '111999');
      if (deviceItem) {
        console.log(`  商品: ${deviceItem.productName}`);
        console.log(`  价格: €${deviceItem.price}`);
        console.log(`  数量: ${deviceItem.quantity}`);
      }
      
      console.log('');
    });
    
    // 3. 检查退款API会查找什么
    console.log('=== 退款API查找逻辑 ===');
    console.log('退款API查找条件:');
    console.log('  merchantId: MurrayRanelagh');
    console.log('  serialNumber: 111999');
    console.log('  status: SOLD');
    console.log('');
    
    const inventoryForRefund = await MerchantInventory.findOne({
      merchantId: 'MurrayRanelagh',
      serialNumber: '111999',
      status: 'SOLD'
    }).lean();
    
    if (inventoryForRefund) {
      console.log('✅ 退款API能找到此库存记录');
    } else {
      console.log('❌ 退款API找不到此库存记录');
      console.log(`   原因: 库存状态是 "${inventory?.status}"，不是 "SOLD"`);
      console.log('   解决方案: 需要修改退款API的查找条件');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkIPhone11Status();
