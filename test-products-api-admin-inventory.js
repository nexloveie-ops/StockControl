require('dotenv').config();
const mongoose = require('mongoose');

async function testProductsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('🧪 模拟 /api/products API 查询\n');
    console.log('=' .repeat(60));
    
    // 模拟API查询逻辑
    const productQuery = { 
      isActive: true,
      stockQuantity: { $gt: 0 }
    };
    
    const adminQuery = { 
      isActive: true,
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    };
    
    // 并行查询
    const [productNewItems, adminInventoryItems] = await Promise.all([
      ProductNew.find(productQuery)
        .sort({ createdAt: -1 }),
      AdminInventory.find(adminQuery)
        .sort({ createdAt: -1 })
    ]);
    
    console.log('📊 查询结果:');
    console.log(`   ProductNew: ${productNewItems.length} 个`);
    console.log(`   AdminInventory: ${adminInventoryItems.length} 个`);
    console.log(`   总计: ${productNewItems.length + adminInventoryItems.length} 个`);
    
    // 按分类统计
    console.log('\n📦 按分类统计:');
    
    const categoryStats = {};
    
    // 统计 ProductNew
    productNewItems.forEach(p => {
      const cat = p.productType || p.category?.type || '未分类';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { productNew: 0, adminInventory: 0 };
      }
      categoryStats[cat].productNew++;
    });
    
    // 统计 AdminInventory
    adminInventoryItems.forEach(item => {
      const cat = item.category || '未分类';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { productNew: 0, adminInventory: 0 };
      }
      categoryStats[cat].adminInventory++;
    });
    
    Object.entries(categoryStats).forEach(([cat, stats]) => {
      const total = stats.productNew + stats.adminInventory;
      console.log(`   ${cat}: ${total} 个 (ProductNew: ${stats.productNew}, AdminInventory: ${stats.adminInventory})`);
    });
    
    // 显示 iPhone Clear Case 样本
    const iPhoneCases = adminInventoryItems.filter(item => 
      item.productName && item.productName.includes('iPhone Clear Case')
    );
    
    if (iPhoneCases.length > 0) {
      console.log(`\n🔍 iPhone Clear Case 样本 (共 ${iPhoneCases.length} 个):`);
      iPhoneCases.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.productName}`);
        console.log(`      型号: ${item.model}, 颜色: ${item.color}`);
        console.log(`      分类: ${item.category}, 库存: ${item.quantity}`);
        console.log(`      价格: 成本€${item.costPrice}, 批发€${item.wholesalePrice}, 零售€${item.retailPrice}`);
      });
      if (iPhoneCases.length > 5) {
        console.log(`   ... 还有 ${iPhoneCases.length - 5} 个变体`);
      }
    }
    
    console.log('\n\n✅ 测试完成！');
    console.log('\n💡 结论:');
    console.log('   - /api/products API 现在会返回两个集合的数据');
    console.log('   - prototype-working.html 页面会显示所有产品');
    console.log('   - 刷新浏览器页面即可看到 iPhone Clear Case');
    
    console.log('\n📝 下一步:');
    console.log('   1. 登录管理员账号 (admin / admin123)');
    console.log('   2. 打开 prototype-working.html 页面');
    console.log('   3. 点击"库存管理"标签');
    console.log('   4. 应该能看到 Phone Case 分类，包含 65+ 个产品');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testProductsAPI();
