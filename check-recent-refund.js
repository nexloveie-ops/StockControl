/**
 * 查询最近的退款记录和退款设备的去向
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkRecentRefund() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 查询最近的销售记录（包含退款信息）
    console.log('=== 查询最近的销售记录 ===');
    const sales = await MerchantSale.find({
      merchantId: 'MurrayRanelagh'
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    console.log(`找到 ${sales.length} 条销售记录\n`);
    
    // 查找有退款的记录
    let refundFound = false;
    
    for (const sale of sales) {
      const hasRefund = sale.items.some(item => item.refunded);
      
      if (hasRefund) {
        refundFound = true;
        console.log('=== 找到退款记录 ===');
        console.log(`订单号: ${sale.saleId || sale.invoiceNumber || sale._id}`);
        console.log(`创建时间: ${new Date(sale.createdAt).toLocaleString('zh-CN')}`);
        console.log(`总金额: €${sale.totalAmount}`);
        console.log('');
        
        console.log('=== 退款商品明细 ===');
        for (const item of sale.items) {
          if (item.refunded) {
            console.log(`商品: ${item.productName}`);
            console.log(`  数量: ${item.quantity}`);
            console.log(`  价格: €${item.price}`);
            console.log(`  序列号: ${item.serialNumber || '无'}`);
            console.log(`  退款状态: ${item.refunded ? '✅ 已退款' : '未退款'}`);
            console.log(`  退款日期: ${item.refundDate ? new Date(item.refundDate).toLocaleString('zh-CN') : '未记录'}`);
            console.log(`  退款金额: €${item.refundAmount || item.price * item.quantity}`);
            
            // 检查是否是设备
            if (item.serialNumber) {
              console.log(`  设备类型: 设备产品`);
              console.log(`  退款后状态: ${item.refundDeviceStatus || '未记录'}`);
              console.log(`  退款后成色: ${item.refundDeviceCondition || '未记录'}`);
              console.log(`  是否补回库存: ${item.refundRestock ? '✅ 是' : '❌ 否'}`);
              
              // 查询库存中是否有这个序列号
              if (item.serialNumber) {
                console.log('');
                console.log('  --- 查询库存 ---');
                const inventory = await MerchantInventory.findOne({
                  serialNumber: item.serialNumber,
                  merchantId: 'MurrayRanelagh'
                }).lean();
                
                if (inventory) {
                  console.log(`  ✅ 在库存中找到`);
                  console.log(`  库存ID: ${inventory._id}`);
                  console.log(`  产品名称: ${inventory.productName}`);
                  console.log(`  成色: ${inventory.condition}`);
                  console.log(`  分类: ${inventory.category}`);
                  console.log(`  数量: ${inventory.quantity}`);
                  console.log(`  状态: ${inventory.status}`);
                  console.log(`  位置: ${inventory.location || '未设置'}`);
                } else {
                  console.log(`  ❌ 库存中未找到（可能未补回库存）`);
                }
              }
            } else {
              console.log(`  产品类型: 配件/其他`);
              console.log(`  是否补回库存: ${item.refundRestock ? '✅ 是' : '❌ 否'}`);
            }
            
            console.log('');
          }
        }
      }
    }
    
    if (!refundFound) {
      console.log('⚠️ 最近5条销售记录中没有找到退款记录');
      console.log('');
      console.log('=== 所有销售记录 ===');
      sales.forEach((sale, index) => {
        console.log(`${index + 1}. 订单号: ${sale.saleId || sale._id}`);
        console.log(`   时间: ${new Date(sale.createdAt).toLocaleString('zh-CN')}`);
        console.log(`   商品数: ${sale.items.length}`);
        console.log(`   总金额: €${sale.totalAmount}`);
        console.log('');
      });
    }
    
    // 2. 查询所有设备库存（按更新时间排序）
    console.log('=== 最近更新的设备库存 ===');
    const recentInventory = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh',
      serialNumber: { $exists: true, $ne: '' }
    }).sort({ updatedAt: -1 }).limit(10).lean();
    
    console.log(`找到 ${recentInventory.length} 条设备库存\n`);
    
    recentInventory.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName}`);
      console.log(`   序列号: ${item.serialNumber}`);
      console.log(`   成色: ${item.condition}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   状态: ${item.status}`);
      console.log(`   更新时间: ${new Date(item.updatedAt).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

checkRecentRefund();
