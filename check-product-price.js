const mongoose = require('mongoose');
require('dotenv').config();

async function checkProduct() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 连接成功\n');

  const db = mongoose.connection.db;
  
  // 搜索包装袋小号
  const collections = ['merchantinventories', 'admininventories', 'productnews', 'products'];
  
  for (const colName of collections) {
    const col = db.collection(colName);
    const items = await col.find({ 
      $or: [
        { productName: /包装袋小号/i },
        { name: /包装袋小号/i },
        { description: /包装袋小号/i }
      ]
    }).toArray();
    
    if (items.length > 0) {
      console.log(`📦 在 ${colName} 找到 ${items.length} 条:\n`);
      items.forEach(item => {
        console.log('  名称:', item.productName || item.name);
        console.log('  零售价:', item.retailPrice);
        console.log('  批发价:', item.wholesalePrice);
        console.log('  成本价:', item.costPrice);
        console.log('  税务分类:', item.taxClassification || item.vatRate);
        console.log('');
      });
    }
  }

  await mongoose.connection.close();
}

checkProduct().catch(console.error);
