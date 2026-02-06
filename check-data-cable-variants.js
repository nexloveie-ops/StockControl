const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDataCableVariants() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查询 AdminInventory 中的 Data Cable
    console.log('=== AdminInventory 中的 Data Cable ===');
    const adminCables = await AdminInventory.find({ 
      productName: /Data Cable/i 
    }).sort({ model: 1, color: 1 });
    
    console.log(`找到 ${adminCables.length} 个产品\n`);
    
    adminCables.forEach((cable, index) => {
      console.log(`${index + 1}. ${cable.productName}`);
      console.log(`   ID: ${cable._id}`);
      console.log(`   品牌: ${cable.brand || '无'}`);
      console.log(`   型号: ${cable.model || '无'}`);
      console.log(`   颜色: ${cable.color || '无'}`);
      console.log(`   成色: ${cable.condition || '无'}`);
      console.log(`   分类: ${cable.category || '无'}`);
      console.log(`   库存: ${cable.quantity}`);
      console.log(`   零售价: €${cable.retailPrice}`);
      console.log(`   税务分类: ${cable.taxClassification}`);
      console.log(`   状态: ${cable.isActive ? '活跃' : '不活跃'}`);
      console.log('');
    });
    
    // 查询 MerchantInventory 中的 Data Cable
    console.log('\n=== MerchantInventory 中的 Data Cable ===');
    const merchantCables = await MerchantInventory.find({ 
      productName: /Data Cable/i,
      status: 'active',
      quantity: { $gt: 0 }
    }).sort({ model: 1, color: 1 });
    
    console.log(`找到 ${merchantCables.length} 个产品\n`);
    
    merchantCables.forEach((cable, index) => {
      console.log(`${index + 1}. ${cable.productName}`);
      console.log(`   ID: ${cable._id}`);
      console.log(`   商户: ${cable.merchantId}`);
      console.log(`   品牌: ${cable.brand || '无'}`);
      console.log(`   型号: ${cable.model || '无'}`);
      console.log(`   颜色: ${cable.color || '无'}`);
      console.log(`   成色: ${cable.condition || '无'}`);
      console.log(`   分类: ${cable.category || '无'}`);
      console.log(`   库存: ${cable.quantity}`);
      console.log(`   零售价: €${cable.retailPrice}`);
      console.log(`   税务分类: ${cable.taxClassification}`);
      console.log(`   状态: ${cable.status}`);
      console.log('');
    });
    
    // 分析变体
    console.log('\n=== 变体分析 ===');
    const variants = new Set();
    const models = new Set();
    const colors = new Set();
    
    merchantCables.forEach(cable => {
      const variantKey = `${cable.model || 'NO_MODEL'}_${cable.color || 'NO_COLOR'}`;
      variants.add(variantKey);
      if (cable.model) models.add(cable.model);
      if (cable.color) colors.add(cable.color);
    });
    
    console.log(`变体数量: ${variants.size}`);
    console.log(`不同型号: ${models.size} - [${Array.from(models).join(', ')}]`);
    console.log(`不同颜色: ${colors.size} - [${Array.from(colors).join(', ')}]`);
    console.log(`变体组合: [${Array.from(variants).join(', ')}]`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkDataCableVariants();
