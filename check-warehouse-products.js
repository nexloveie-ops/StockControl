require('dotenv').config();
const mongoose = require('mongoose');

async function checkWarehouseProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功');
    
    const ProductNew = require('./models/ProductNew');
    
    // 检查所有产品
    const allProducts = await ProductNew.find({});
    console.log(`\n📦 数据库中总产品数: ${allProducts.length}`);
    
    // 检查有库存的产品
    const productsWithStock = await ProductNew.find({ 
      stockQuantity: { $gt: 0 }
    });
    console.log(`📦 有库存的产品数: ${productsWithStock.length}`);
    
    // 检查激活且有库存的产品
    const activeProductsWithStock = await ProductNew.find({ 
      isActive: true,
      stockQuantity: { $gt: 0 }
    });
    console.log(`📦 激活且有库存的产品数: ${activeProductsWithStock.length}`);
    
    // 显示前5个产品的详细信息
    if (activeProductsWithStock.length > 0) {
      console.log('\n前5个可订购产品:');
      activeProductsWithStock.slice(0, 5).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   库存: ${product.stockQuantity}`);
        console.log(`   批发价: €${product.wholesalePrice}`);
        console.log(`   零售价: €${product.retailPrice}`);
        console.log(`   成色: ${product.condition}`);
        console.log(`   激活: ${product.isActive}`);
      });
    } else {
      console.log('\n⚠️ 没有找到可订购的产品！');
      console.log('\n检查所有产品的状态:');
      allProducts.slice(0, 5).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   库存: ${product.stockQuantity}`);
        console.log(`   激活: ${product.isActive}`);
      });
    }
    
    // 按分类统计
    const categories = await ProductNew.aggregate([
      {
        $match: {
          isActive: true,
          stockQuantity: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$productType',
          count: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    if (categories.length > 0) {
      console.log('\n\n📊 按分类统计:');
      categories.forEach(cat => {
        console.log(`   ${cat._id}: ${cat.count} 种产品, ${cat.totalStock} 件库存`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkWarehouseProducts();
