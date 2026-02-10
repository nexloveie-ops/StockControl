require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const AdminInventory = require('./models/AdminInventory');

    // 1. 查找最近5分钟创建的产品
    console.log('📱 查找最近5分钟创建的产品...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentProducts = await AdminInventory.find({
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log(`找到 ${recentProducts.length} 个最近创建的产品:\n`);
    
    if (recentProducts.length > 0) {
      recentProducts.forEach((product, index) => {
        console.log(`产品 ${index + 1}:`);
        console.log(`  产品名称: ${product.productName}`);
        console.log(`  型号: ${product.model || 'N/A'}`);
        console.log(`  颜色: ${product.color || 'N/A'}`);
        console.log(`  订单号: "${product.invoiceNumber || 'N/A'}" (type: ${typeof product.invoiceNumber})`);
        console.log(`  供货商: "${product.supplier || 'N/A'}" (type: ${typeof product.supplier})`);
        console.log(`  位置: "${product.location || 'N/A'}" (type: ${typeof product.location})`);
        console.log(`  来源: ${product.source}`);
        console.log(`  创建时间: ${product.createdAt}`);
        console.log('');
      });
    } else {
      console.log('没有找到最近5分钟创建的产品');
    }

    // 2. 查找所有 SI-003 订单的产品
    console.log('\n📦 查找所有 invoiceNumber 为 SI-003 的产品...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const si003Products = await AdminInventory.find({ 
      invoiceNumber: 'SI-003' 
    }).lean();
    
    console.log(`✅ 找到 ${si003Products.length} 个产品关联到 SI-003 订单\n`);
    
    if (si003Products.length > 0) {
      // 按产品名称分组
      const grouped = {};
      si003Products.forEach(product => {
        const name = product.productName || 'Unknown';
        if (!grouped[name]) {
          grouped[name] = [];
        }
        grouped[name].push(product);
      });
      
      Object.keys(grouped).forEach(productName => {
        const items = grouped[productName];
        console.log(`${productName}: ${items.length} 个变体`);
      });
    }

    // 3. 统计所有产品的订单号分布
    console.log('\n\n📊 统计所有产品的订单号分布...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allProducts = await AdminInventory.find({}).lean();
    const invoiceNumberStats = {};
    
    allProducts.forEach(product => {
      const invoiceNum = product.invoiceNumber || 'N/A';
      if (!invoiceNumberStats[invoiceNum]) {
        invoiceNumberStats[invoiceNum] = 0;
      }
      invoiceNumberStats[invoiceNum]++;
    });
    
    console.log('订单号分布:');
    Object.keys(invoiceNumberStats).sort().forEach(invoiceNum => {
      console.log(`  ${invoiceNum}: ${invoiceNumberStats[invoiceNum]} 个产品`);
    });

  } catch (error) {
    console.error('❌ 查询失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

checkData();
