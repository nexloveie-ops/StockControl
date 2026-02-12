// 验证仓库订单 WO-20260212-2243 的税额和金额计算
require('dotenv').config();
const mongoose = require('mongoose');

async function verifyWarehouseOrderTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    
    const orderNumber = 'WO-20260212-2243';
    
    const order = await WarehouseOrder.findOne({ orderNumber }).lean();
    
    if (!order) {
      console.log(`❌ 找不到订单: ${orderNumber}`);
      return;
    }
    
    console.log(`📦 仓库订单: ${orderNumber}\n`);
    console.log('基本信息:');
    console.log(`  商户: ${order.merchantName} (${order.merchantId})`);
    console.log(`  状态: ${order.status}`);
    console.log(`  产品数量: ${order.items?.length || 0}\n`);
    
    console.log('产品详情和税额计算:');
    console.log('─'.repeat(140));
    console.log('产品名称'.padEnd(30) + '型号'.padEnd(20) + '成色'.padEnd(15) + '数量'.padEnd(8) + '税率'.padEnd(18) + '批发价'.padEnd(12) + '小计'.padEnd(12) + '税额');
    console.log('─'.repeat(140));
    
    let calculatedSubtotal = 0;  // 不含税小计
    let calculatedTaxAmount = 0;  // 税额
    let calculatedTotalAmount = 0;  // 含税总额
    
    order.items.forEach(item => {
      const productName = item.productName || 'N/A';
      const model = item.model || '';
      const condition = item.condition || '';
      const quantity = item.quantity || 0;
      const taxClassification = item.taxClassification || '';
      const wholesalePrice = item.wholesalePrice || 0;
      const subtotal = item.subtotal || 0;
      const taxAmount = item.taxAmount || 0;
      
      // 重新计算税额（验证）
      let recalculatedTax = 0;
      let recalculatedSubtotal = 0;
      
      if (taxClassification === 'VAT_23' || taxClassification === 'VAT 23%') {
        // wholesalePrice是含税价格
        // 不含税小计 = 含税小计 / 1.23
        // 税额 = 含税小计 - 不含税小计
        recalculatedSubtotal = subtotal / 1.23;
        recalculatedTax = subtotal - recalculatedSubtotal;
      } else if (taxClassification === 'VAT_13_5' || taxClassification === 'VAT 13.5%') {
        recalculatedSubtotal = subtotal / 1.135;
        recalculatedTax = subtotal - recalculatedSubtotal;
      } else if (taxClassification === 'MARGIN_VAT' || taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: 采购时税额为0
        recalculatedSubtotal = subtotal;
        recalculatedTax = 0;
      } else if (taxClassification === 'VAT_0' || taxClassification === 'VAT 0%') {
        recalculatedSubtotal = subtotal;
        recalculatedTax = 0;
      }
      
      console.log(
        productName.substring(0, 28).padEnd(30) +
        model.substring(0, 18).padEnd(20) +
        condition.substring(0, 13).padEnd(15) +
        quantity.toString().padEnd(8) +
        taxClassification.padEnd(18) +
        `€${wholesalePrice.toFixed(2)}`.padEnd(12) +
        `€${subtotal.toFixed(2)}`.padEnd(12) +
        `€${taxAmount.toFixed(2)}`
      );
      
      calculatedSubtotal += recalculatedSubtotal;
      calculatedTaxAmount += recalculatedTax;
      calculatedTotalAmount += subtotal;  // 含税总额就是所有subtotal之和
    });
    
    console.log('─'.repeat(140));
    console.log(
      '总计'.padEnd(73) +
      `€${calculatedTotalAmount.toFixed(2)}`.padEnd(12) +
      `€${calculatedTaxAmount.toFixed(2)}`
    );
    console.log('─'.repeat(140));
    
    console.log('\n📊 重新计算结果:');
    console.log(`  不含税小计(Subtotal Excl. VAT): €${calculatedSubtotal.toFixed(2)}`);
    console.log(`  税额(Tax Amount): €${calculatedTaxAmount.toFixed(2)}`);
    console.log(`  含税总额(Total Amount): €${calculatedTotalAmount.toFixed(2)}`);
    
    console.log('\n📋 订单中存储的数据:');
    console.log(`  subtotal: €${(order.subtotal || 0).toFixed(2)}`);
    console.log(`  taxAmount: €${(order.taxAmount || 0).toFixed(2)}`);
    console.log(`  totalAmount: €${(order.totalAmount || 0).toFixed(2)}`);
    
    // 验证
    console.log('\n✅ 验证结果:');
    const subtotalMatch = Math.abs((order.subtotal || 0) - calculatedSubtotal) < 0.01;
    const taxMatch = Math.abs((order.taxAmount || 0) - calculatedTaxAmount) < 0.01;
    const totalMatch = Math.abs((order.totalAmount || 0) - calculatedTotalAmount) < 0.01;
    
    if (subtotalMatch && taxMatch && totalMatch) {
      console.log('✅ 所有金额和税额计算正确！');
    } else {
      console.log('❌ 发现计算差异:');
      if (!subtotalMatch) {
        console.log(`  不含税小计差异: €${Math.abs((order.subtotal || 0) - calculatedSubtotal).toFixed(2)}`);
        console.log(`    订单存储: €${(order.subtotal || 0).toFixed(2)}`);
        console.log(`    重新计算: €${calculatedSubtotal.toFixed(2)}`);
      }
      if (!taxMatch) {
        console.log(`  税额差异: €${Math.abs((order.taxAmount || 0) - calculatedTaxAmount).toFixed(2)}`);
        console.log(`    订单存储: €${(order.taxAmount || 0).toFixed(2)}`);
        console.log(`    重新计算: €${calculatedTaxAmount.toFixed(2)}`);
      }
      if (!totalMatch) {
        console.log(`  含税总额差异: €${Math.abs((order.totalAmount || 0) - calculatedTotalAmount).toFixed(2)}`);
        console.log(`    订单存储: €${(order.totalAmount || 0).toFixed(2)}`);
        console.log(`    重新计算: €${calculatedTotalAmount.toFixed(2)}`);
      }
    }
    
    console.log('\n💡 仓库订单税额计算说明:');
    console.log('  - wholesalePrice是含税价格');
    console.log('  - subtotal = wholesalePrice × quantity（含税）');
    console.log('  - VAT 23%: 不含税小计 = 含税小计 / 1.23, 税额 = 含税小计 - 不含税小计');
    console.log('  - Margin VAT: 采购时税额 = 0, 不含税小计 = 含税小计');
    console.log('  - totalAmount = 所有items的subtotal之和（含税）');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

verifyWarehouseOrderTax();
