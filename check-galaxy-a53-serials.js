require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');

async function checkGalaxyA53() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找 Samsung Galaxy A53 产品
    const product = await ProductNew.findOne({
      name: 'Samsung Galaxy A53'
    });

    if (!product) {
      console.log('❌ 未找到 Samsung Galaxy A53 产品');
      return;
    }

    console.log('📱 产品信息:');
    console.log('   名称:', product.name);
    console.log('   SKU:', product.sku);
    console.log('   数量:', product.stockQuantity);
    console.log('   分类:', product.productType);
    console.log('   成色:', product.condition);
    console.log('   进货价: €' + product.costPrice);
    console.log('   批发价: €' + product.wholesalePrice);
    console.log('   零售价: €' + product.retailPrice);
    console.log('   VAT税率:', product.vatRate);
    console.log('');
    console.log('📋 序列号信息:');
    console.log('   序列号数组长度:', product.serialNumbers.length);
    
    if (product.serialNumbers.length > 0) {
      console.log('   序列号列表:');
      product.serialNumbers.forEach((sn, index) => {
        console.log(`   ${index + 1}. ${sn.serialNumber} - 颜色: ${sn.color || '无'} - 状态: ${sn.status}`);
      });
    } else {
      console.log('   ⚠️  没有序列号数据');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkGalaxyA53();
