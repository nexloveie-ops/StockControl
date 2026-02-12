// 检查仓库订单 WO-20260212-2243 的税额和金额计算
require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouseOrder() {
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
    console.log(`  商户ID: ${order.merchantId || 'N/A'}`);
    console.log(`  订单日期: ${order.orderDate}`);
    console.log(`  状态: ${order.status}`);
    console.log(`  产品数量: ${order.products?.length || 0}\n`);
    
    console.log('产品详情:');
    console.log('─'.repeat(140));
    console.log('产品名称'.padEnd(25) + '型号'.padEnd(20) + '成色'.padEnd(15) + '数量'.padEnd(8) + '税率'.padEnd(18) + '单价'.padEnd(12) + '小计'.padEnd(12) + '税额');
    console.log('─'.repeat(140));
    
    let totalSubtotal = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;
    
    order.products.forEach(product => {
      const productName = product.productName || 'N/A';
      const model = product.model || '';
      const condition = product.condition || '';
      const quantity = product.quantity || 0;
      const taxClassification = product.taxClassification || '';
      const wholesalePrice = product.wholesalePrice || 0;
      
      // 计算小计和税额
      const subtotal = wholesalePrice * quantity;
      let taxAmount = 0;
      let itemTotal = 0;
      
      // 判断wholesalePrice是含税还是不含税
      // 根据之前的修复，仓库订单的wholesalePrice应该是含税价格
      if (taxClassification === 'VAT_23' || taxClassification === 'VAT 23%') {
        // 标准VAT: wholesalePrice是含税价格
        itemTotal = subtotal;
        taxAmount = subtotal - (subtotal / 1.23);
      } else if (taxClassification === 'VAT_13_5' || taxClassification === 'VAT 13.5%') {
        itemTotal = subtotal;
        taxAmount = subtotal - (subtotal / 1.135);
      } else if (taxClassification === 'MARGIN_VAT' || taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: 采购时税额为0
        itemTotal = subtotal;
        taxAmount = 0;
      } else if (taxClassification === 'VAT_0' || taxClassification === 'VAT 0%') {
        itemTotal = subtotal;
        taxAmount = 0;
      }
      
      console.log(
        productName.substring(0, 23).padEnd(25) +
        model.substring(0, 18).padEnd(20) +
        condition.substring(0, 13).padEnd(15) +
        quantity.toString().padEnd(8) +
        taxClassification.padEnd(18) +
        `€${wholesalePrice.toFixed(2)}`.padEnd(12) +
        `€${itemTotal.toFixed(2)}`.padEnd(12) +
        `€${taxAmount.toFixed(2)}`
      );
      
      totalSubtotal += subtotal;
      totalTaxAmount += taxAmount;
      totalAmount += itemTotal;
    });
    
    console.log('─'.repeat(140));
    console.log(
      '总计'.padEnd(68) +
      `€${totalAmount.toFixed(2)}`.padEnd(12) +
      `€${totalTaxAmount.toFixed(2)}`
    );
    console.log('─'.repeat(140));
    
    console.log('\n📊 计算结果:');
    console.log(`  总金额(Total Amount): €${totalAmount.toFixed(2)}`);
    console.log(`  总税额(Tax Amount): €${totalTaxAmount.toFixed(2)}`);
    
    console.log('\n📋 订单中存储的数据:');
    console.log(`  totalAmount: €${order.totalAmount || 0}`);
    console.log(`  taxAmount: €${order.taxAmount || 0}`);
    
    // 检查是否匹配
    const amountMatch = Math.abs((order.totalAmount || 0) - totalAmount) < 0.01;
    const taxMatch = Math.abs((order.taxAmount || 0) - totalTaxAmount) < 0.01;
    
    console.log('\n验证结果:');
    if (amountMatch && taxMatch) {
      console.log('✅ 订单中的金额和税额计算正确');
    } else {
      console.log('❌ 订单中的金额或税额计算有误:');
      if (!amountMatch) {
        console.log(`  总金额差异: €${Math.abs((order.totalAmount || 0) - totalAmount).toFixed(2)}`);
        console.log(`    订单存储: €${(order.totalAmount || 0).toFixed(2)}`);
        console.log(`    重新计算: €${totalAmount.toFixed(2)}`);
      }
      if (!taxMatch) {
        console.log(`  税额差异: €${Math.abs((order.taxAmount || 0) - totalTaxAmount).toFixed(2)}`);
        console.log(`    订单存储: €${(order.taxAmount || 0).toFixed(2)}`);
        console.log(`    重新计算: €${totalTaxAmount.toFixed(2)}`);
      }
    }
    
    console.log('\n💡 仓库订单税额计算说明:');
    console.log('  - wholesalePrice是含税价格');
    console.log('  - VAT 23%: 税额 = 含税金额 - (含税金额 / 1.23)');
    console.log('  - VAT 13.5%: 税额 = 含税金额 - (含税金额 / 1.135)');
    console.log('  - Margin VAT: 采购时税额 = 0');
    console.log('  - VAT 0%: 税额 = 0');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkWarehouseOrder();
