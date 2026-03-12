const mongoose = require('mongoose');
require('dotenv').config();

async function checkScreenSaver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const ProductTemplate = require('./models/ProductTemplate');
    
    const merchantId = 'Mobile123';
    const category = 'Screen Saver';
    
    console.log(`📊 查询 ${merchantId} 的 ${category} 产品\n`);
    
    // 查询库存产品
    const inventoryProducts = await MerchantInventory.find({
      merchantId: merchantId,
      category: category,
      isActive: true
    }).lean();
    
    console.log(`📦 MerchantInventory 中的产品 (${inventoryProducts.length} 个):`);
    inventoryProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.productName} (${p.model || 'N/A'} - ${p.color || 'N/A'})`);
      console.log(`   - 数量: ${p.quantity}`);
      console.log(`   - 状态: ${p.status}`);
      console.log(`   - isActive: ${p.isActive}`);
      console.log(`   - 序列号: ${p.serialNumber || 'N/A'}`);
      console.log('');
    });
    
    // 查询模板产品
    const templates = await ProductTemplate.find({
      userId: merchantId,
      category: category,
      isActive: true
    }).lean();
    
    console.log(`\n🎨 ProductTemplate 中的产品 (${templates.length} 个):`);
    templates.forEach((t, i) => {
      const totalStock = t.trackInventory 
        ? t.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
        : 0;
      console.log(`${i + 1}. ${t.name}`);
      console.log(`   - 跟踪库存: ${t.trackInventory}`);
      console.log(`   - 总库存: ${totalStock}`);
      console.log(`   - 变体数: ${t.variants ? t.variants.length : 0}`);
      console.log('');
    });
    
    // 统计符合前端过滤条件的产品
    const filteredInventory = inventoryProducts.filter(p => 
      p.quantity > 0 && p.status === 'active'
    );
    
    const filteredTemplates = templates.filter(t => {
      if (!t.isActive) return false;
      if (t.trackInventory) {
        const totalStock = t.variants ? t.variants.reduce((sum, v) => sum + (v.quantity || 0), 0) : 0;
        return totalStock > 0;
      }
      return true;
    });
    
    console.log(`\n📊 前端过滤后的统计:`);
    console.log(`   - 库存产品: ${filteredInventory.length} 个`);
    console.log(`   - 模板产品: ${filteredTemplates.length} 个`);
    console.log(`   - 总计: ${filteredInventory.length + filteredTemplates.length} 个`);
    
    console.log(`\n❌ 被过滤掉的库存产品 (${inventoryProducts.length - filteredInventory.length} 个):`);
    inventoryProducts.filter(p => !(p.quantity > 0 && p.status === 'active')).forEach((p, i) => {
      console.log(`${i + 1}. ${p.productName} (${p.model || 'N/A'} - ${p.color || 'N/A'})`);
      console.log(`   - 原因: ${p.quantity <= 0 ? '库存为0' : ''} ${p.status !== 'active' ? `状态为${p.status}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkScreenSaver();
