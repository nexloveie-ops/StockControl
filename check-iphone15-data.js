require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');

async function checkIPhone15() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找 iPhone 15 128GB AB
    console.log('🔍 查找 iPhone 15 128GB AB:');
    console.log('='.repeat(80));
    
    const products = await ProductNew.find({
      name: /iPhone 15.*128GB.*AB/i
    });
    
    if (products.length === 0) {
      console.log('⚠️  未找到匹配的产品');
      
      // 显示所有 iPhone 15 产品
      console.log('\n📱 所有 iPhone 15 产品:');
      const allIPhone15 = await ProductNew.find({
        name: /iPhone 15/i
      });
      
      allIPhone15.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   SKU: ${p.sku}`);
        console.log(`   数量: ${p.stockQuantity}`);
        console.log(`   序列号数量: ${p.serialNumbers?.length || 0}`);
      });
    } else {
      console.log(`找到 ${products.length} 个产品:\n`);
      
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   _id: ${product._id}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   数量: ${product.stockQuantity}`);
        console.log(`   分类: ${product.productType}`);
        console.log(`   成色: ${product.condition}`);
        console.log(`   进货价: €${product.costPrice}`);
        console.log(`   批发价: €${product.wholesalePrice}`);
        console.log(`   零售价: €${product.retailPrice}`);
        console.log(`   序列号数组长度: ${product.serialNumbers?.length || 0}`);
        
        if (product.serialNumbers && product.serialNumbers.length > 0) {
          console.log(`   序列号详情:`);
          product.serialNumbers.forEach((sn, i) => {
            console.log(`     ${i + 1}. ${sn.serialNumber || '无'} - 状态: ${sn.status}`);
          });
        } else {
          console.log(`   ⚠️  没有序列号数据`);
        }
        
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkIPhone15();
