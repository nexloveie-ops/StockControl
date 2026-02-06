require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function fixWarehouseOrderMarginVatTax() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    // 查找所有仓库订单
    const orders = await WarehouseOrder.find({}).lean();
    
    console.log(`=== 找到 ${orders.length} 个仓库订单 ===\n`);
    
    let updatedCount = 0;
    let marginVatCount = 0;
    
    for (const order of orders) {
      let orderNeedsUpdate = false;
      let newTotalTaxAmount = 0;
      const updatedItems = [];
      
      for (const item of order.items) {
        let updatedItem = { ...item };
        
        // 只处理 Margin VAT 且 taxAmount 为 0 的项目
        if (item.taxClassification === 'MARGIN_VAT_0' && item.taxAmount === 0) {
          marginVatCount++;
          
          // 查找产品获取成本价
          let product = await ProductNew.findById(item.productId);
          let isAdminInventory = false;
          
          if (!product) {
            product = await AdminInventory.findById(item.productId);
            isAdminInventory = true;
          }
          
          if (product) {
            const costPrice = product.costPrice || 0;
            const wholesalePrice = item.wholesalePrice || 0;
            const quantity = item.quantity || 0;
            
            // 计算差价和税额
            const totalPrice = wholesalePrice * quantity;
            const totalCost = costPrice * quantity;
            const margin = totalPrice - totalCost;
            const taxAmount = margin * (23 / 123);
            
            console.log(`\n📦 ${order.orderNumber} - ${item.productName}`);
            console.log(`   数量: ${quantity}`);
            console.log(`   批发价: €${wholesalePrice.toFixed(2)}`);
            console.log(`   成本价: €${costPrice.toFixed(2)}`);
            console.log(`   总价: €${totalPrice.toFixed(2)}`);
            console.log(`   总成本: €${totalCost.toFixed(2)}`);
            console.log(`   差价: €${margin.toFixed(2)}`);
            console.log(`   旧税额: €${item.taxAmount.toFixed(2)}`);
            console.log(`   新税额: €${taxAmount.toFixed(2)}`);
            
            updatedItem.taxAmount = taxAmount;
            orderNeedsUpdate = true;
          } else {
            console.log(`⚠️  产品不存在: ${item.productId}`);
          }
        }
        
        updatedItems.push(updatedItem);
        newTotalTaxAmount += updatedItem.taxAmount || 0;
      }
      
      // 如果订单需要更新
      if (orderNeedsUpdate) {
        await WarehouseOrder.findByIdAndUpdate(order._id, {
          items: updatedItems,
          taxAmount: newTotalTaxAmount
        });
        
        updatedCount++;
        console.log(`\n✅ 更新订单: ${order.orderNumber}`);
        console.log(`   旧总税额: €${order.taxAmount.toFixed(2)}`);
        console.log(`   新总税额: €${newTotalTaxAmount.toFixed(2)}`);
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`总订单数: ${orders.length}`);
    console.log(`Margin VAT 项目数: ${marginVatCount}`);
    console.log(`更新订单数: ${updatedCount}`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixWarehouseOrderMarginVatTax();
