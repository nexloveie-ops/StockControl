require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 检查仓库管理员用户
    console.log('👤 检查仓库管理员用户:');
    console.log('='.repeat(60));
    const warehouseUsers = await User.find({ 
      role: 'warehouse_manager' 
    }).select('username userId groupId');
    
    console.log(`找到 ${warehouseUsers.length} 个仓库管理员:\n`);
    warehouseUsers.forEach(user => {
      console.log(`用户名: ${user.username}`);
      console.log(`userId: ${user.userId}`);
      console.log(`groupId: ${user.groupId || '无'}`);
      console.log('');
    });

    // 检查所有产品
    console.log('\n📦 检查所有产品:');
    console.log('='.repeat(60));
    const allProducts = await Product.find().sort({ createdAt: -1 }).limit(10);
    
    if (allProducts.length === 0) {
      console.log('⚠️  数据库中没有任何产品数据');
    } else {
      console.log(`找到 ${allProducts.length} 个产品（最新10个）:\n`);
      allProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   分类: ${product.productType}`);
        console.log(`   数量: ${product.quantity}`);
        console.log(`   userId: ${product.userId || '无'}`);
        console.log(`   groupId: ${product.groupId || '无'}`);
        console.log(`   创建时间: ${product.createdAt}`);
        console.log('');
      });
    }

    // 按 userId 分组统计
    console.log('\n📊 按用户统计产品数量:');
    console.log('='.repeat(60));
    const productsByUser = await Product.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    if (productsByUser.length === 0) {
      console.log('没有产品数据');
    } else {
      for (const item of productsByUser) {
        const user = await User.findOne({ userId: item._id });
        console.log(`userId: ${item._id || '无'} (${user?.username || '未知用户'}) - ${item.count} 个产品`);
      }
    }

    // 按 groupId 分组统计
    console.log('\n📊 按组统计产品数量:');
    console.log('='.repeat(60));
    const productsByGroup = await Product.aggregate([
      {
        $group: {
          _id: '$groupId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    if (productsByGroup.length === 0) {
      console.log('没有产品数据');
    } else {
      productsByGroup.forEach(item => {
        console.log(`groupId: ${item._id || '无'} - ${item.count} 个产品`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkInventory();
