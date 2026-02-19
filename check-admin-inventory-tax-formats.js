require('dotenv').config();
const mongoose = require('mongoose');

async function checkTaxFormats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const AdminInventory = require('./models/AdminInventory');

    // 查找所有AdminInventory记录
    const products = await AdminInventory.find({});

    console.log(`📦 找到 ${products.length} 条AdminInventory记录\n`);

    // 统计税务分类格式
    const taxFormats = {};

    products.forEach(product => {
      const tax = product.taxClassification || 'undefined';
      if (!taxFormats[tax]) {
        taxFormats[tax] = [];
      }
      taxFormats[tax].push({
        name: product.productName,
        condition: product.condition,
        serialNumber: product.serialNumber
      });
    });

    console.log('📊 税务分类统计:\n');
    for (const [tax, items] of Object.entries(taxFormats)) {
      console.log(`${tax}: ${items.length} 条记录`);
      items.slice(0, 3).forEach(item => {
        console.log(`  - ${item.name} (${item.condition}) ${item.serialNumber || '配件'}`);
      });
      if (items.length > 3) {
        console.log(`  ... 还有 ${items.length - 3} 条记录`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

checkTaxFormats();
