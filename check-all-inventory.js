require('dotenv').config();
const mongoose = require('mongoose');
const AdminInventory = require('./models/AdminInventory');

async function checkAllInventory() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    console.log('📊 查询所有产品库存...\n');

    const products = await AdminInventory.find({}).sort({ createdAt: -1 });
    
    console.log(`找到 ${products.length} 个产品\n`);
    
    if (products.length === 0) {
      console.log('ℹ️  数据库中没有产品');
      await mongoose.connection.close();
      return;
    }

    // 按产品名称分组，查找重复的产品
    const productGroups = {};
    
    products.forEach(product => {
      const key = `${product.productName}_${product.model || ''}_${product.serialNumber || product.barcode || ''}`;
      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(product);
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('所有产品列表：');
    console.log('═══════════════════════════════════════════════════════\n');

    let duplicateCount = 0;
    let index = 1;

    for (const [key, group] of Object.entries(productGroups)) {
      if (group.length > 1) {
        console.log(`\n⚠️  发现重复产品 (${group.length} 条记录):`);
        duplicateCount += group.length - 1;
      }
      
      group.forEach(product => {
        console.log(`\n${index}. 产品信息:`);
        console.log(`   ID: ${product._id}`);
        console.log(`   产品名称: ${product.productName}`);
        console.log(`   型号: ${product.model || '无'}`);
        console.log(`   颜色: ${product.color || '无'}`);
        console.log(`   品牌: ${product.brand || '无'}`);
        console.log(`   分类: ${product.productType || '无'}`);
        console.log(`   数量: ${product.quantity}`);
        console.log(`   序列号: ${product.serialNumber || '无'}`);
        console.log(`   条码: ${product.barcode || '无'}`);
        console.log(`   进货价: €${product.costPrice || 0}`);
        console.log(`   批发价: €${product.wholesalePrice || 0}`);
        console.log(`   零售价: €${product.retailPrice || 0}`);
        console.log(`   成色: ${product.condition || '无'}`);
        console.log(`   状态: ${product.status || 'active'}`);
        console.log(`   创建时间: ${product.createdAt}`);
        console.log(`   门店组: ${product.storeGroup || '无'}`);
        index++;
      });
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('统计信息：');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`总产品数: ${products.length}`);
    console.log(`重复产品数: ${duplicateCount}`);
    console.log(`唯一产品数: ${Object.keys(productGroups).length}`);

    // 查找可能不合理的数据
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('⚠️  可能不合理的数据：');
    console.log('═══════════════════════════════════════════════════════\n');

    let issueCount = 0;

    products.forEach((product, idx) => {
      const issues = [];
      
      // 检查产品名称
      if (!product.productName || product.productName.trim() === '') {
        issues.push('产品名称为空');
      }
      
      // 检查价格
      if (!product.costPrice || product.costPrice <= 0) {
        issues.push('进货价无效');
      }
      if (!product.wholesalePrice || product.wholesalePrice <= 0) {
        issues.push('批发价无效');
      }
      if (!product.retailPrice || product.retailPrice <= 0) {
        issues.push('零售价无效');
      }
      
      // 检查价格逻辑
      if (product.wholesalePrice && product.costPrice && product.wholesalePrice <= product.costPrice) {
        issues.push(`批发价(€${product.wholesalePrice})不高于进货价(€${product.costPrice})`);
      }
      if (product.retailPrice && product.wholesalePrice && product.retailPrice <= product.wholesalePrice) {
        issues.push(`零售价(€${product.retailPrice})不高于批发价(€${product.wholesalePrice})`);
      }
      
      // 检查设备产品的序列号
      if (product.productType && product.productType.toLowerCase().includes('device')) {
        if (!product.serialNumber || product.serialNumber.trim() === '') {
          issues.push('设备产品缺少序列号');
        }
      }
      
      if (issues.length > 0) {
        issueCount++;
        console.log(`${issueCount}. 产品 ID: ${product._id}`);
        console.log(`   产品名称: ${product.productName}`);
        console.log(`   问题: ${issues.join(', ')}`);
        console.log('');
      }
    });

    if (issueCount === 0) {
      console.log('✅ 没有发现明显不合理的数据');
    } else {
      console.log(`⚠️  发现 ${issueCount} 个产品存在问题`);
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkAllInventory();
