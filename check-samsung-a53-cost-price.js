// 查询Samsung Galaxy A53的进货价
require('dotenv').config();
const mongoose = require('mongoose');

async function checkCostPrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    
    // 查询订单中的产品ID
    const productId = '698d2cb5802e1948295683fb';
    
    const product = await ProductNew.findById(productId).lean();
    
    if (!product) {
      console.log(`❌ 找不到产品: ${productId}`);
      return;
    }
    
    console.log(`📱 产品信息: ${product.name}\n`);
    console.log('详细信息:');
    console.log(`  产品名称: ${product.name}`);
    console.log(`  品牌: ${product.brand}`);
    console.log(`  型号: ${product.model}`);
    console.log(`  颜色: ${product.color}`);
    console.log(`  成色: ${product.condition}`);
    console.log(`  税率: ${product.taxClassification}`);
    console.log(`  库存数量: ${product.stockQuantity}\n`);
    
    console.log('价格信息:');
    console.log(`  进货价(Cost Price): €${product.costPrice || 0}`);
    console.log(`  批发价(Wholesale Price): €${product.wholesalePrice || 0}`);
    console.log(`  零售价(Retail Price): €${product.retailPrice || 0}\n`);
    
    console.log('📊 仓库订单中的价格:');
    console.log(`  批发价: €95.00`);
    console.log(`  数量: 2`);
    console.log(`  小计: €190.00\n`);
    
    console.log('💡 价格说明:');
    console.log(`  - 进货价(Cost Price): €${product.costPrice || 0} - 仓库从供应商采购的价格`);
    console.log(`  - 批发价(Wholesale Price): €${product.wholesalePrice || 0} - 仓库卖给商户的价格`);
    console.log(`  - 零售价(Retail Price): €${product.retailPrice || 0} - 商户卖给最终客户的建议价格\n`);
    
    const costPrice = product.costPrice || 0;
    const wholesalePrice = product.wholesalePrice || 0;
    const margin = wholesalePrice - costPrice;
    const marginPercent = costPrice > 0 ? (margin / costPrice * 100) : 0;
    
    console.log('📈 仓库利润分析:');
    console.log(`  进货价: €${costPrice.toFixed(2)}`);
    console.log(`  批发价: €${wholesalePrice.toFixed(2)}`);
    console.log(`  利润: €${margin.toFixed(2)}`);
    console.log(`  利润率: ${marginPercent.toFixed(2)}%\n`);
    
    console.log('🧾 对于仓库管理员:');
    console.log(`  这个产品的进货价是: €${costPrice.toFixed(2)}`);
    console.log(`  卖给商户的批发价是: €${wholesalePrice.toFixed(2)}`);
    console.log(`  每台赚取: €${margin.toFixed(2)}`);
    console.log(`  2台总利润: €${(margin * 2).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkCostPrice();
