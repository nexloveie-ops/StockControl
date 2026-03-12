const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const ProductTemplate = require('./models/ProductTemplate');
    const MerchantSale = require('./models/MerchantSale');
    
    const merchantId = 'Mobile123';
    const productName = 'iPhone 3-layer Shockproof Case';
    const searchPattern = 'iPhone 3-layer Shockproof Case (iPhone 13/14 - Clear)';
    
    console.log(`🔍 查询产品: ${searchPattern}\n`);
    
    // 1. 查询销售记录
    console.log('📊 销售记录:');
    const sales = await MerchantSale.find({
      merchantId: merchantId,
      'items.productName': searchPattern
    }).lean();
    
    console.log(`   找到 ${sales.length} 条销售记录\n`);
    
    let totalSold = 0;
    sales.forEach((sale, i) => {
      const items = sale.items.filter(item => item.productName === searchPattern);
      items.forEach(item => {
        totalSold += item.quantity;
        console.log(`   ${i + 1}. 销售日期: ${new Date(sale.saleDate).toLocaleDateString()}`);
        console.log(`      - 数量: ${item.quantity}`);
        console.log(`      - 价格: €${item.price}`);
        console.log(`      - isTemplate: ${item.isTemplate || false}`);
        console.log(`      - templateId: ${item.templateId || 'N/A'}`);
        console.log(`      - variantIndex: ${item.variantIndex !== undefined ? item.variantIndex : 'N/A'}`);
        console.log('');
      });
    });
    
    console.log(`   总销售量: ${totalSold}\n`);
    
    // 2. 查询库存产品（MerchantInventory）
    console.log('📦 MerchantInventory 库存:');
    
    // 尝试多种匹配方式
    const inventoryProducts = await MerchantInventory.find({
      merchantId: merchantId,
      $or: [
        { productName: productName },
        { productName: searchPattern },
        { productName: new RegExp('iPhone 3-layer Shockproof Case', 'i') }
      ]
    }).lean();
    
    console.log(`   找到 ${inventoryProducts.length} 个库存记录\n`);
    
    let totalInventoryStock = 0;
    inventoryProducts.forEach((p, i) => {
      totalInventoryStock += p.quantity;
      console.log(`   ${i + 1}. ${p.productName}`);
      console.log(`      - 型号: ${p.model || 'N/A'}`);
      console.log(`      - 颜色: ${p.color || 'N/A'}`);
      console.log(`      - 数量: ${p.quantity}`);
      console.log(`      - 状态: ${p.status}`);
      console.log(`      - isActive: ${p.isActive}`);
      console.log(`      - 零售价: €${p.retailPrice}`);
      console.log('');
    });
    
    console.log(`   总库存: ${totalInventoryStock}\n`);
    
    // 3. 查询模板产品（ProductTemplate）
    console.log('🎨 ProductTemplate 模板:');
    
    const templates = await ProductTemplate.find({
      userId: merchantId,
      $or: [
        { name: productName },
        { name: searchPattern },
        { name: new RegExp('iPhone 3-layer Shockproof Case', 'i') }
      ]
    }).lean();
    
    console.log(`   找到 ${templates.length} 个模板\n`);
    
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      - 分类: ${t.category}`);
      console.log(`      - 跟踪库存: ${t.trackInventory}`);
      console.log(`      - isActive: ${t.isActive}`);
      console.log(`      - 变体数: ${t.variants ? t.variants.length : 0}`);
      
      if (t.variants && t.variants.length > 0) {
        console.log(`      - 变体详情:`);
        t.variants.forEach((v, vi) => {
          const values = v.values ? Object.entries(v.values).map(([k, val]) => `${k}: ${val}`).join(', ') : 'N/A';
          console.log(`        [${vi}] ${values}`);
          console.log(`            库存: ${v.quantity || 0}, 零售价: €${v.retailPrice}`);
        });
      }
      console.log('');
    });
    
    // 4. 分析热销产品报表的匹配逻辑
    console.log('🔍 热销产品报表匹配分析:\n');
    
    // 从销售记录中提取产品信息
    if (sales.length > 0) {
      const sampleItem = sales[0].items.find(item => item.productName === searchPattern);
      
      console.log('   销售记录中的产品信息:');
      console.log(`   - productName: "${sampleItem.productName}"`);
      console.log(`   - model: "${sampleItem.model || ''}"`);
      console.log(`   - color: "${sampleItem.color || ''}"`);
      console.log(`   - isTemplate: ${sampleItem.isTemplate || false}`);
      console.log(`   - templateId: ${sampleItem.templateId || 'N/A'}`);
      console.log(`   - variantIndex: ${sampleItem.variantIndex !== undefined ? sampleItem.variantIndex : 'N/A'}`);
      console.log('');
      
      // 如果是模板产品
      if (sampleItem.isTemplate && sampleItem.templateId) {
        console.log('   ✅ 这是模板产品，应该从 ProductTemplate 查找库存');
        const template = templates.find(t => t._id.toString() === sampleItem.templateId.toString());
        if (template) {
          console.log(`   ✅ 找到模板: ${template.name}`);
          if (sampleItem.variantIndex !== undefined && template.variants[sampleItem.variantIndex]) {
            const variant = template.variants[sampleItem.variantIndex];
            console.log(`   ✅ 找到变体 [${sampleItem.variantIndex}]: 库存 ${variant.quantity || 0}`);
          } else {
            console.log(`   ❌ 未找到变体索引 ${sampleItem.variantIndex}`);
          }
        } else {
          console.log(`   ❌ 未找到模板 ID: ${sampleItem.templateId}`);
        }
      } else {
        console.log('   ✅ 这是普通产品，应该从 MerchantInventory 查找库存');
        
        // 尝试精确匹配
        const exactMatch = inventoryProducts.filter(p => 
          p.productName === sampleItem.productName &&
          p.model === (sampleItem.model || '') &&
          (p.color || '') === (sampleItem.color || '')
        );
        
        console.log(`   精确匹配结果: ${exactMatch.length} 个`);
        
        if (exactMatch.length === 0) {
          // 尝试模糊匹配
          console.log('   尝试模糊匹配...');
          
          let baseProductName = sampleItem.productName;
          const parenIndex = baseProductName.indexOf('(');
          if (parenIndex > 0) {
            baseProductName = baseProductName.substring(0, parenIndex).trim();
          }
          
          let extractedModel = '';
          let extractedColor = '';
          const match = sampleItem.productName.match(/\(([^-]+)\s*-\s*([^)]+)\)/);
          if (match) {
            extractedModel = match[1].trim();
            extractedColor = match[2].trim();
          }
          
          console.log(`   - 基础产品名: "${baseProductName}"`);
          console.log(`   - 提取的型号: "${extractedModel}"`);
          console.log(`   - 提取的颜色: "${extractedColor}"`);
          
          const fuzzyMatch = inventoryProducts.filter(p => {
            const nameMatch = p.productName === baseProductName;
            const modelMatch = !extractedModel || p.model === extractedModel;
            const colorMatch = !extractedColor || (p.color && p.color.toLowerCase() === extractedColor.toLowerCase());
            return nameMatch && modelMatch && colorMatch;
          });
          
          console.log(`   模糊匹配结果: ${fuzzyMatch.length} 个`);
          
          if (fuzzyMatch.length > 0) {
            fuzzyMatch.forEach(p => {
              console.log(`   - ${p.productName} (${p.model || 'N/A'} - ${p.color || 'N/A'}): 库存 ${p.quantity}`);
            });
          }
        } else {
          exactMatch.forEach(p => {
            console.log(`   - ${p.productName} (${p.model || 'N/A'} - ${p.color || 'N/A'}): 库存 ${p.quantity}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkProductStock();
