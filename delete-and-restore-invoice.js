const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 连接成功\n');

  const db = mongoose.connection.db;
  const salesCol = db.collection('salesinvoices');
  const inventoryCol = db.collection('merchantinventories');
  const adminCol = db.collection('admininventories');

  // 1. 查找发票
  const invoice = await salesCol.findOne({ invoiceNumber: 'SI-1774621956925-0004' });
  if (!invoice) {
    console.log('❌ 未找到发票');
    await mongoose.connection.close();
    return;
  }

  console.log('📄 发票详情:');
  console.log('  发票号:', invoice.invoiceNumber);
  console.log('  总金额:', invoice.totalAmount);
  console.log('  商品数:', invoice.items.length);
  console.log('\n商品明细:');
  invoice.items.forEach((item, i) => {
    console.log(`  ${i+1}. ${item.description} | 数量: ${item.quantity} | 单价: ${item.unitPrice}`);
  });

  // 2. 还原库存 - 对每个商品增加库存
  console.log('\n🔄 还原库存...');
  for (const item of invoice.items) {
    const productName = item.description;
    const qty = item.quantity;

    // 先在merchantinventories中查找
    const merchantItem = await inventoryCol.findOne({
      productName: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    });

    if (merchantItem) {
      const newQty = (merchantItem.quantity || 0) + qty;
      await inventoryCol.updateOne(
        { _id: merchantItem._id },
        { $set: { quantity: newQty } }
      );
      console.log(`  ✅ ${productName}: ${merchantItem.quantity} → ${newQty}`);
    } else {
      // 在admininventories中查找
      const adminItem = await adminCol.findOne({
        productName: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      });
      if (adminItem) {
        const newQty = (adminItem.quantity || 0) + qty;
        await adminCol.updateOne(
          { _id: adminItem._id },
          { $set: { quantity: newQty } }
        );
        console.log(`  ✅ ${productName} (admin): ${adminItem.quantity} → ${newQty}`);
      } else {
        console.log(`  ⚠️  未找到产品: ${productName}`);
      }
    }
  }

  // 3. 删除发票
  const deleteResult = await salesCol.deleteOne({ _id: invoice._id });
  console.log(`\n🗑️  删除发票: ${deleteResult.deletedCount} 条`);
  console.log('✅ 完成！');

  await mongoose.connection.close();
}

run().catch(console.error);
