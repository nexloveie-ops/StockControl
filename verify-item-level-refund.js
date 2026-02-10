require('dotenv').config();
const mongoose = require('mongoose');

async function verifyItemLevelRefund() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const MerchantSale = require('./models/MerchantSale');
    
    const saleId = '698abab1ea107400f2c00d2c';
    console.log(`🔍 验证订单商品级别退款: ${saleId}\n`);
    
    const sale = await MerchantSale.findById(saleId);
    
    if (!sale) {
      console.log('❌ 未找到该订单');
      return;
    }
    
    console.log('📋 订单商品分析:');
    console.log('='.repeat(80));
    
    const refundedItemsInSale = sale.refundItems || [];
    
    sale.items.forEach((item, index) => {
      // 检查该商品是否被退款
      const isItemRefunded = refundedItemsInSale.some(refundItem => {
        if (item.serialNumber && refundItem.serialNumber) {
          return item.serialNumber === refundItem.serialNumber;
        }
        return refundItem.productName === item.productName && 
               refundItem.price === item.price;
      });
      
      console.log(`\n商品 ${index + 1}: ${item.productName}`);
      console.log(`  序列号: ${item.serialNumber || 'N/A'}`);
      console.log(`  价格: €${item.price.toFixed(2)}`);
      console.log(`  退款状态: ${isItemRefunded ? '❌ 已退款' : '✅ 正常'}`);
      
      if (isItemRefunded) {
        const refundItem = refundedItemsInSale.find(r => 
          (item.serialNumber && r.serialNumber === item.serialNumber) ||
          (r.productName === item.productName && r.price === item.price)
        );
        console.log(`  退款金额: €${refundItem.totalAmount.toFixed(2)}`);
        console.log(`  匹配方式: ${item.serialNumber ? '序列号匹配' : '产品名称+价格匹配'}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 退款汇总:');
    console.log('='.repeat(80));
    console.log(`总商品数: ${sale.items.length}`);
    console.log(`已退款商品: ${refundedItemsInSale.length}`);
    console.log(`正常商品: ${sale.items.length - refundedItemsInSale.length}`);
    console.log(`订单状态: ${sale.status}`);
    console.log(`退款金额: €${sale.refundAmount ? sale.refundAmount.toFixed(2) : '0.00'}`);
    console.log(`订单总额: €${sale.totalAmount.toFixed(2)}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 预期显示效果:');
    console.log('='.repeat(80));
    
    sale.items.forEach((item, index) => {
      const isItemRefunded = refundedItemsInSale.some(refundItem => {
        if (item.serialNumber && refundItem.serialNumber) {
          return item.serialNumber === refundItem.serialNumber;
        }
        return refundItem.productName === item.productName && 
               refundItem.price === item.price;
      });
      
      if (isItemRefunded) {
        console.log(`${item.productName}: 🔴 红色背景 + 删除线 + "已退款"徽章`);
      } else {
        console.log(`${item.productName}: ⚪ 白色背景 + "正常"徽章`);
      }
    });
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

verifyItemLevelRefund();
