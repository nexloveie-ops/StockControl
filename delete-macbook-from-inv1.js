const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 连接成功\n');

  const db = mongoose.connection.db;
  const col = db.collection('merchantinventories');

  // 查找并删除
  const item = await col.findOne({
    $or: [
      { productName: /Macbook Air/i, model: /A2337/i },
      { productName: /Macbook Air/i, color: /GOLD/i }
    ],
    notes: /发票号:\s*INV-001/i
  });

  if (!item) {
    console.log('❌ 未找到，尝试更宽泛搜索...');
    const items = await col.find({ productName: /Macbook Air/i }).toArray();
    items.forEach(i => console.log(`  - ${i.productName} | ${i.model} | ${i.color} | notes: ${i.notes}`));
    await mongoose.connection.close();
    return;
  }

  console.log('找到记录:');
  console.log(`  名称: ${item.productName}`);
  console.log(`  型号: ${item.model}`);
  console.log(`  颜色: ${item.color}`);
  console.log(`  notes: ${item.notes}`);

  const result = await col.deleteOne({ _id: item._id });
  console.log(`\n✅ 删除成功，删除数量: ${result.deletedCount}`);

  await mongoose.connection.close();
}

run().catch(console.error);
