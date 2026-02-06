require('dotenv').config();
const mongoose = require('mongoose');

async function checkProducts() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 检查 AdminInventory 中的产品
    const AdminInventory = mongoose.model('AdminInventory', new mongoose.Schema({}, { strict: false, collection: 'admininventories' }));
    
    console.log('📦 AdminInventory 集合统计：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalCount = await AdminInventory.countDocuments();
    console.log(`总产品数: ${totalCount}\n`);
    
    // 按分类统计
    const categories = await AdminInventory.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('按分类统计：');
    categories.forEach(cat => {
      console.log(`  ${cat._id || '未分类'}: ${cat.count} 个产品, 总库存: ${cat.totalQuantity}`);
    });
    
    // 检查 Screen Saver
    console.log('\n📱 Screen Saver 产品：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const screenSavers = await AdminInventory.find({ category: 'Screen Saver' }).limit(5);
    console.log(`找到 ${screenSavers.length} 个 Screen Saver 产品（显示前5个）：`);
    screenSavers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.productName} - ${p.model} - ${p.color}`);
      console.log(`     库存: ${p.quantity}, 价格: €${p.retailPrice}`);
    });
    
    // 检查 Phone Case
    console.log('\n📱 Phone Case 产品：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const phoneCases = await AdminInventory.find({ 
      $or: [
        { category: 'Phone Case' },
        { category: 'phone case' },
        { category: /case/i },
        { productName: /case/i }
      ]
    }).limit(5);
    console.log(`找到 ${phoneCases.length} 个 Phone Case 产品（显示前5个）：`);
    if (phoneCases.length > 0) {
      phoneCases.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.productName} - ${p.model} - ${p.color}`);
        console.log(`     分类: ${p.category}, 库存: ${p.quantity}, 价格: €${p.retailPrice}`);
      });
    } else {
      console.log('  ⚠️  没有找到 Phone Case 产品');
    }
    
    // 显示所有产品名称（去重）
    console.log('\n📋 所有产品名称（去重）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const productNames = await AdminInventory.distinct('productName');
    productNames.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

checkProducts();
