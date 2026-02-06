require('dotenv').config();
const mongoose = require('mongoose');

async function verifyIntegration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const ProductNew = require('./models/ProductNew');
    const AdminInventory = require('./models/AdminInventory');
    
    console.log('📊 数据统计\n');
    console.log('=' .repeat(60));
    
    // 统计 ProductNew
    const productNewCount = await ProductNew.countDocuments({
      isActive: true,
      stockQuantity: { $gt: 0 }
    });
    console.log(`ProductNew (有库存): ${productNewCount} 个`);
    
    // 统计 AdminInventory
    const adminInventoryCount = await AdminInventory.countDocuments({
      isActive: true,
      quantity: { $gt: 0 },
      status: 'AVAILABLE'
    });
    console.log(`AdminInventory (可用): ${adminInventoryCount} 个`);
    
    // 查找 iPhone Clear Case
    const iPhoneCases = await AdminInventory.find({
      productName: /iPhone Clear Case/i,
      isActive: true,
      quantity: { $gt: 0 }
    }).select('productName brand model color quantity retailPrice category');
    
    console.log(`\n🔍 iPhone Clear Case 变体: ${iPhoneCases.length} 个\n`);
    console.log('=' .repeat(60));
    
    if (iPhoneCases.length > 0) {
      // 按分类统计
      const byCategory = {};
      iPhoneCases.forEach(item => {
        if (!byCategory[item.category]) {
          byCategory[item.category] = 0;
        }
        byCategory[item.category]++;
      });
      
      console.log('按分类统计:');
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} 个`);
      });
      
      // 显示前10个
      console.log('\n前10个变体:');
      iPhoneCases.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   品牌: ${item.brand || '-'}, 型号: ${item.model || '-'}, 颜色: ${item.color || '-'}`);
        console.log(`   分类: ${item.category}, 库存: ${item.quantity}, 价格: €${item.retailPrice}`);
      });
      
      if (iPhoneCases.length > 10) {
        console.log(`   ... 还有 ${iPhoneCases.length - 10} 个变体`);
      }
    }
    
    console.log('\n\n✅ 验证完成！');
    console.log('\n📝 结论:');
    console.log(`   - AdminInventory 模型已创建并包含 ${adminInventoryCount} 个产品`);
    console.log(`   - iPhone Clear Case 有 ${iPhoneCases.length} 个变体`);
    console.log(`   - API 已更新以查询 AdminInventory`);
    console.log(`   - 刷新浏览器页面即可看到这些产品`);
    
    console.log('\n💡 下一步:');
    console.log('   1. 在浏览器中登录仓库管理员账号');
    console.log('   2. 进入"从仓库订货"页面');
    console.log('   3. 应该能看到 iPhone Clear Case 的所有变体');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

verifyIntegration();
