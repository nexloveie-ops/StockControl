/**
 * 检查特定销售记录的原始成色
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkSpecificSale() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    // 查找 iPhone 11 的销售记录
    const sales = await MerchantSale.find({
      'items.productName': /iPhone 11/i
    }).sort({ date: -1 }).limit(3).lean();
    
    console.log(`找到 ${sales.length} 条 iPhone 11 销售记录\n`);
    
    sales.forEach((sale, index) => {
      console.log(`=== 销售记录 ${index + 1} ===`);
      console.log(`订单号: ${sale.saleId || sale.invoiceNumber || sale._id}`);
      console.log(`日期: ${new Date(sale.date).toLocaleString('zh-CN')}`);
      console.log(`总金额: €${sale.totalAmount}`);
      console.log('');
      
      sale.items.forEach((item, itemIndex) => {
        if (item.productName.includes('iPhone 11')) {
          console.log(`  商品: ${item.productName}`);
          console.log(`  数量: ${item.quantity}`);
          console.log(`  价格: €${item.price}`);
          console.log(`  序列号: ${item.serialNumber || '无'}`);
          console.log(`  originalCondition: ${item.originalCondition || '❌ 未设置'}`);
          console.log(`  originalCategory: ${item.originalCategory || '❌ 未设置'}`);
          console.log('');
        }
      });
    });
    
    // 查询这个产品在库存中的成色
    const MerchantInventory = require('./models/MerchantInventory');
    const inventory = await MerchantInventory.findOne({
      productName: /iPhone 11/i,
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    if (inventory) {
      console.log('=== 库存中的 iPhone 11 ===');
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`成色: ${inventory.condition || '未设置'}`);
      console.log(`分类: ${inventory.category || '未设置'}`);
      console.log(`数量: ${inventory.quantity}`);
    } else {
      console.log('⚠️ 库存中没有找到 iPhone 11');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkSpecificSale();
