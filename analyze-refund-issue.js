const mongoose = require('mongoose');
require('dotenv').config();

async function analyzeRefundIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantSale = require('./models/MerchantSale');
    
    const orderId = '69b16fd70988845670dacb91';
    
    console.log('🔍 分析退款问题\n');
    
    // 查询订单
    const sale = await MerchantSale.findById(orderId).lean();
    
    if (!sale) {
      console.log('❌ 订单不存在');
      return;
    }
    
    console.log('📋 订单信息:');
    console.log(`订单ID: ${sale._id}`);
    console.log(`总金额: €${sale.totalAmount}`);
    console.log(`退款金额: €${sale.refundAmount || 0}`);
    console.log(`状态: ${sale.status}`);
    console.log('');
    
    console.log('📊 退款逻辑分析:');
    console.log('');
    
    const totalRefundAmount = sale.refundAmount || 0;
    const totalAmount = sale.totalAmount;
    const difference = Math.abs(totalRefundAmount - totalAmount);
    
    console.log(`1. 退款金额: €${totalRefundAmount}`);
    console.log(`2. 订单总额: €${totalAmount}`);
    console.log(`3. 差额: €${difference.toFixed(2)}`);
    console.log(`4. 是否全额退款 (差额 < 0.01): ${difference < 0.01 ? '是' : '否'}`);
    console.log('');
    
    if (difference < 0.01) {
      console.log('✅ 根据代码逻辑，这应该是全额退款');
      console.log('✅ 状态应该被设置为: refunded');
    } else {
      console.log('⚠️  根据代码逻辑，这是部分退款');
      console.log('⚠️  状态应该保持为: completed');
    }
    console.log('');
    
    // 检查退款项目
    console.log('📦 退款项目:');
    if (sale.refundItems && sale.refundItems.length > 0) {
      let totalRefundItemsAmount = 0;
      sale.refundItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.productName}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   单价: €${item.price}`);
        console.log(`   小计: €${item.totalAmount || (item.price * item.quantity)}`);
        totalRefundItemsAmount += (item.totalAmount || (item.price * item.quantity));
      });
      console.log('');
      console.log(`退款项目总额: €${totalRefundItemsAmount}`);
      console.log('');
      
      if (Math.abs(totalRefundItemsAmount - totalRefundAmount) > 0.01) {
        console.log('⚠️  警告：退款项目总额与退款金额不一致！');
        console.log(`   退款项目总额: €${totalRefundItemsAmount}`);
        console.log(`   记录的退款金额: €${totalRefundAmount}`);
      }
    } else {
      console.log('❌ 没有退款项目记录');
    }
    console.log('');
    
    // 检查销售项目
    console.log('📦 销售项目:');
    let totalSalesItemsAmount = 0;
    sale.items.forEach((item, i) => {
      console.log(`${i + 1}. ${item.productName}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   单价: €${item.price}`);
      console.log(`   小计: €${item.price * item.quantity}`);
      totalSalesItemsAmount += (item.price * item.quantity);
    });
    console.log('');
    console.log(`销售项目总额: €${totalSalesItemsAmount}`);
    console.log('');
    
    if (Math.abs(totalSalesItemsAmount - totalAmount) > 0.01) {
      console.log('⚠️  警告：销售项目总额与订单总额不一致！');
      console.log(`   销售项目总额: €${totalSalesItemsAmount}`);
      console.log(`   订单总额: €${totalAmount}`);
    }
    
    console.log('\n🔍 问题诊断:');
    console.log('');
    
    // 诊断问题
    if (totalRefundAmount > totalAmount) {
      console.log('❌ 问题：退款金额 (€' + totalRefundAmount + ') 大于订单总额 (€' + totalAmount + ')');
      console.log('   这可能导致退款逻辑判断错误');
      console.log('   原因：可能是多次退款累加导致');
    } else if (difference >= 0.01 && difference < 1) {
      console.log('⚠️  问题：退款金额与订单总额差额很小 (€' + difference.toFixed(2) + ')');
      console.log('   但超过了0.01的阈值，导致被判定为部分退款');
      console.log('   原因：可能是计算精度问题或折扣导致');
    } else if (difference < 0.01) {
      console.log('✅ 退款金额正确，应该被判定为全额退款');
      console.log('❌ 但实际状态是: ' + sale.status);
      console.log('   问题：退款API可能没有被正确调用，或者状态更新失败');
    } else {
      console.log('⚠️  这是部分退款，状态应该保持为 completed');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

analyzeRefundIssue();
