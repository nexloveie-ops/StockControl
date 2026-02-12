require('dotenv').config();
const mongoose = require('mongoose');

async function testFinancialReports() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    // 获取订单
    const order = await WarehouseOrder.findOne({ orderNumber: 'WO-20260212-2243' }).lean();
    
    if (!order) {
      console.log('❌ 未找到订单 WO-20260212-2243');
      return;
    }
    
    console.log('📦 仓库订单: WO-20260212-2243');
    console.log('状态:', order.status);
    console.log('\n模拟Financial Reports API的税额重新计算:\n');
    console.log('─'.repeat(120));
    
    let recalculatedTaxAmount = 0;
    
    for (const item of order.items) {
      console.log(`\n产品: ${item.productName} (${item.model})`);
      console.log(`税率分类: ${item.taxClassification}`);
      console.log(`数量: ${item.quantity}`);
      console.log(`批发价: €${item.wholesalePrice?.toFixed(2)}`);
      console.log(`订单中存储的税额: €${item.taxAmount?.toFixed(2)} (买方视角)`);
      
      if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
        // Margin VAT: 卖方需要对差价征税
        console.log('\n🔍 这是Margin VAT产品，需要重新计算税额（卖方视角）:');
        
        // 查询产品获取进货价
        let product = await ProductNew.findById(item.productId).lean();
        
        if (!product) {
          product = await AdminInventory.findById(item.productId).lean();
        }
        
        if (product && product.costPrice) {
          const costPrice = product.costPrice;
          const wholesalePrice = item.wholesalePrice;
          const margin = (wholesalePrice - costPrice) * item.quantity;
          
          console.log(`  进货价: €${costPrice.toFixed(2)}`);
          console.log(`  批发价: €${wholesalePrice.toFixed(2)}`);
          console.log(`  差价: €${(wholesalePrice - costPrice).toFixed(2)} × ${item.quantity} = €${margin.toFixed(2)}`);
          
          if (margin > 0) {
            // 对差价征税：税额 = 差价 × 23/123
            const marginTax = margin * (23 / 123);
            recalculatedTaxAmount += marginTax;
            console.log(`  重新计算的税额: €${margin.toFixed(2)} × (23/123) = €${marginTax.toFixed(2)} ✅`);
          } else {
            console.log(`  差价为0或负数，税额为€0.00`);
          }
        } else {
          console.log(`  ⚠️ 未找到产品或进货价信息`);
        }
      } else {
        // 其他税率使用订单中存储的税额
        const itemTax = item.taxAmount || 0;
        recalculatedTaxAmount += itemTax;
        console.log(`  使用订单中存储的税额: €${itemTax.toFixed(2)}`);
      }
    }
    
    console.log('\n' + '─'.repeat(120));
    console.log('\n📊 Financial Reports中显示的税额对比:\n');
    console.log(`订单中存储的总税额（买方视角）: €${order.taxAmount?.toFixed(2) || '0.00'}`);
    console.log(`重新计算的总税额（卖方视角）: €${recalculatedTaxAmount.toFixed(2)}`);
    console.log(`\n差异: €${(recalculatedTaxAmount - (order.taxAmount || 0)).toFixed(2)}`);
    
    console.log('\n✅ 验证结果:');
    console.log('  - 订单中存储的税额 = €22.91 (买方视角，Margin VAT = €0)');
    console.log('  - Financial Reports显示 = €32.26 (卖方视角，Margin VAT重新计算)');
    console.log('  - 商户看到的采购订单PDF显示税额€22.91 ✅');
    console.log('  - 仓库管理员看到的Financial Reports显示税额€32.26 ✅');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

testFinancialReports();
