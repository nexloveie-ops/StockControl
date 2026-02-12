require('dotenv').config();
const mongoose = require('mongoose');

async function verifyWarehouseOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const order = await WarehouseOrder.findOne({ orderNumber: 'WO-20260212-2243' }).lean();
    
    if (!order) {
      console.log('❌ 未找到订单 WO-20260212-2243');
      return;
    }
    
    console.log('📦 仓库订单: WO-20260212-2243');
    console.log('商户:', order.merchantId);
    console.log('状态:', order.status);
    console.log('完成时间:', order.completedAt);
    console.log('\n产品详情:');
    console.log('─'.repeat(120));
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productName || '未知产品'}`);
        console.log(`   型号: ${item.model || 'N/A'}`);
        console.log(`   税率分类: ${item.taxClassification || 'N/A'}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   批发价: €${item.wholesalePrice?.toFixed(2) || '0.00'}`);
        console.log(`   小计: €${(item.wholesalePrice * item.quantity)?.toFixed(2) || '0.00'}`);
        console.log(`   税额: €${item.taxAmount?.toFixed(2) || '0.00'}`);
        
        if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
          console.log(`   ✅ Margin VAT产品 - 买方采购时税额应为€0.00`);
        }
      });
    } else {
      console.log('❌ 订单中没有产品');
    }
    
    console.log('\n' + '─'.repeat(120));
    console.log('\n订单总计:');
    console.log(`  小计: €${order.subtotal?.toFixed(2) || '0.00'}`);
    console.log(`  税额: €${order.taxAmount?.toFixed(2) || '0.00'}`);
    console.log(`  总计: €${order.totalAmount?.toFixed(2) || '0.00'}`);
    
    // 验证Margin VAT产品的税额
    const marginVatItems = order.items?.filter(item => 
      item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT'
    ) || [];
    
    if (marginVatItems.length > 0) {
      console.log('\n\n🔍 Margin VAT产品验证:');
      marginVatItems.forEach(item => {
        const isCorrect = item.taxAmount === 0;
        console.log(`  ${item.productName}: 税额 €${item.taxAmount?.toFixed(2) || '0.00'} ${isCorrect ? '✅' : '❌'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifyWarehouseOrder();
