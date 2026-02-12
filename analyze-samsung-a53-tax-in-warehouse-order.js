// 分析Samsung Galaxy A53在仓库订单中的税额计算
require('dotenv').config();
const mongoose = require('mongoose');

async function analyzeTax() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const WarehouseOrder = require('./models/WarehouseOrder');
    const ProductNew = require('./models/ProductNew');
    
    const orderNumber = 'WO-20260212-2243';
    const order = await WarehouseOrder.findOne({ orderNumber }).lean();
    
    if (!order) {
      console.log(`❌ 找不到订单: ${orderNumber}`);
      return;
    }
    
    // 找到Samsung Galaxy A53
    const samsungItem = order.items.find(item => 
      item.productName === 'Samsung Galaxy A53' && item.model === '128GB'
    );
    
    if (!samsungItem) {
      console.log('❌ 找不到Samsung Galaxy A53');
      return;
    }
    
    console.log('📱 Samsung Galaxy A53 在订单中的数据:\n');
    console.log(`  产品名称: ${samsungItem.productName}`);
    console.log(`  型号: ${samsungItem.model}`);
    console.log(`  SKU: ${samsungItem.sku}`);
    console.log(`  成色: ${samsungItem.condition}`);
    console.log(`  税率: ${samsungItem.taxClassification}`);
    console.log(`  数量: ${samsungItem.quantity}`);
    console.log(`  批发价: €${samsungItem.wholesalePrice}`);
    console.log(`  小计: €${samsungItem.subtotal}`);
    console.log(`  订单中存储的税额: €${samsungItem.taxAmount}\n`);
    
    // 查询产品的进货价
    const product = await ProductNew.findById(samsungItem.productId).lean();
    
    if (!product) {
      console.log('❌ 找不到产品详情');
      return;
    }
    
    console.log('📊 产品的价格信息:\n');
    console.log(`  进货价(Cost Price): €${product.costPrice}`);
    console.log(`  批发价(Wholesale Price): €${product.wholesalePrice}`);
    console.log(`  零售价(Retail Price): €${product.retailPrice}\n`);
    
    console.log('💡 Margin VAT税额计算分析:\n');
    
    const costPrice = product.costPrice;
    const wholesalePrice = samsungItem.wholesalePrice;
    const quantity = samsungItem.quantity;
    
    console.log('方案1: 仓库采购时不计税（当前逻辑）');
    console.log(`  进货价: €${costPrice} × ${quantity} = €${costPrice * quantity}`);
    console.log(`  批发价: €${wholesalePrice} × ${quantity} = €${wholesalePrice * quantity}`);
    console.log(`  税额: €0.00`);
    console.log(`  说明: Margin VAT产品，仓库从供应商采购时不计进项税\n`);
    
    console.log('方案2: 仓库批发时对差价征税');
    const margin = (wholesalePrice - costPrice) * quantity;
    const taxOnMargin = margin - (margin / 1.23);
    console.log(`  进货价: €${costPrice} × ${quantity} = €${costPrice * quantity}`);
    console.log(`  批发价: €${wholesalePrice} × ${quantity} = €${wholesalePrice * quantity}`);
    console.log(`  差价: €${margin.toFixed(2)}`);
    console.log(`  对差价征税(23%): €${margin.toFixed(2)} - (€${margin.toFixed(2)} / 1.23) = €${taxOnMargin.toFixed(2)}`);
    console.log(`  说明: 如果仓库在批发环节对差价征收Margin VAT\n`);
    
    console.log('方案3: 批发价包含标准VAT 23%');
    const taxOnWholesale = (wholesalePrice * quantity) - ((wholesalePrice * quantity) / 1.23);
    console.log(`  批发价(含税): €${wholesalePrice} × ${quantity} = €${wholesalePrice * quantity}`);
    console.log(`  不含税金额: €${((wholesalePrice * quantity) / 1.23).toFixed(2)}`);
    console.log(`  税额(23%): €${taxOnWholesale.toFixed(2)}`);
    console.log(`  说明: 如果批发价被视为含标准VAT的价格\n`);
    
    console.log('❓ 问题: 当前订单中税额为€0.00，这是否正确？\n');
    console.log('📋 正确的税务处理应该是:');
    console.log('  对于Margin VAT二手商品:');
    console.log('  - 仓库从供应商采购: 进货价€70，不计进项税 ✅');
    console.log('  - 仓库批发给商户: 批发价€95，不计销项税 ✅');
    console.log('  - 商户零售给客户: 对差价(售价-成本)征收Margin VAT');
    console.log('\n  所以仓库订单中税额€0.00是正确的！');
    console.log('\n  但是，如果批发价€95是含税价格，那么需要重新计算。');
    console.log('  请确认: 批发价€95是含税还是不含税？');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

analyzeTax();
