// 修复仓库订单 WO-20260212-2243 的Margin VAT税额计算
require('dotenv').config();
const mongoose = require('mongoose');

async function fixWarehouseOrderMarginVAT() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    
    const orderNumber = 'WO-20260212-2243';
    
    const order = await WarehouseOrder.findOne({ orderNumber });
    
    if (!order) {
      console.log(`❌ 找不到订单: ${orderNumber}`);
      return;
    }
    
    console.log(`📦 修复仓库订单: ${orderNumber}\n`);
    console.log('修复前的数据:');
    console.log(`  总金额: €${order.totalAmount}`);
    console.log(`  不含税小计: €${order.subtotal}`);
    console.log(`  税额: €${order.taxAmount}\n`);
    
    let newSubtotal = 0;
    let newTaxAmount = 0;
    let totalAmount = 0;
    
    console.log('重新计算每个产品的税额:\n');
    
    for (let item of order.items) {
      const oldTaxAmount = item.taxAmount;
      
      // 查询产品获取进货价
      let product = await ProductNew.findById(item.productId);
      let isAdminInventory = false;
      
      // 如果ProductNew中没有，尝试从AdminInventory查找
      if (!product) {
        const AdminInventory = require('./models/AdminInventory');
        product = await AdminInventory.findById(item.productId);
        isAdminInventory = true;
      }
      
      if (!product) {
        console.log(`⚠️  产品不存在: ${item.productName}, 跳过`);
        // 保持原税额
        newSubtotal += (item.subtotal - item.taxAmount);
        newTaxAmount += item.taxAmount;
        totalAmount += item.subtotal;
        continue;
      }
      
      const itemTotal = item.subtotal; // 批发价总额（含税）
      let newItemTaxAmount = 0;
      let newItemSubtotal = 0;
      
      if (item.taxClassification === 'MARGIN_VAT_0' || item.taxClassification === 'MARGIN_VAT') {
        // Margin VAT: 对差价征税
        const costPrice = product.costPrice || 0;
        const wholesalePrice = item.wholesalePrice;
        const margin = (wholesalePrice - costPrice) * item.quantity;
        
        if (margin > 0) {
          newItemTaxAmount = margin * (23 / 123);
        } else {
          newItemTaxAmount = 0;
        }
        
        newItemSubtotal = itemTotal - newItemTaxAmount;
        
        console.log(`${item.productName} (${item.model})`);
        console.log(`  进货价: €${costPrice} × ${item.quantity} = €${costPrice * item.quantity}`);
        console.log(`  批发价: €${wholesalePrice} × ${item.quantity} = €${itemTotal}`);
        console.log(`  差价: €${margin.toFixed(2)}`);
        console.log(`  旧税额: €${oldTaxAmount.toFixed(2)}`);
        console.log(`  新税额: €${newItemTaxAmount.toFixed(2)}`);
        console.log(`  差异: €${(newItemTaxAmount - oldTaxAmount).toFixed(2)}\n`);
        
      } else if (item.taxClassification === 'VAT_23') {
        // VAT 23%
        newItemTaxAmount = itemTotal * (23 / 123);
        newItemSubtotal = itemTotal - newItemTaxAmount;
        
        console.log(`${item.productName} (${item.model}) - VAT 23%`);
        console.log(`  税额保持不变: €${newItemTaxAmount.toFixed(2)}\n`);
        
      } else {
        // 其他税率
        newItemTaxAmount = oldTaxAmount;
        newItemSubtotal = itemTotal - newItemTaxAmount;
      }
      
      // 更新item的税额
      item.taxAmount = newItemTaxAmount;
      
      newSubtotal += newItemSubtotal;
      newTaxAmount += newItemTaxAmount;
      totalAmount += itemTotal;
    }
    
    // 更新订单总计
    order.subtotal = newSubtotal;
    order.taxAmount = newTaxAmount;
    order.totalAmount = totalAmount;
    
    console.log('修复后的数据:');
    console.log(`  总金额: €${order.totalAmount.toFixed(2)}`);
    console.log(`  不含税小计: €${order.subtotal.toFixed(2)}`);
    console.log(`  税额: €${order.taxAmount.toFixed(2)}\n`);
    
    // 保存订单
    await order.save();
    
    console.log('✅ 订单已更新！\n');
    
    console.log('📊 修复总结:');
    console.log(`  Samsung Galaxy A53的税额从 €0.00 改为 €9.35`);
    console.log(`  订单总税额从 €22.91 改为 €${order.taxAmount.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

fixWarehouseOrderMarginVAT();
