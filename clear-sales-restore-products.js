require('dotenv').config();
const mongoose = require('mongoose');
const SalesInvoice = require('./models/SalesInvoice');
const ProductNew = require('./models/ProductNew');

async function clearSalesAndRestoreProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 1. 获取所有销售记录
    const salesInvoices = await SalesInvoice.find({});
    console.log(`📋 找到 ${salesInvoices.length} 条销售记录\n`);

    if (salesInvoices.length === 0) {
      console.log('✅ 没有销售记录需要删除');
      return;
    }

    // 2. 恢复产品状态
    let restoredProducts = 0;
    let restoredSerialNumbers = 0;

    for (const invoice of salesInvoices) {
      console.log(`\n处理销售发票: ${invoice.invoiceNumber}`);
      
      for (const item of invoice.items) {
        if (!item.product) continue;

        const product = await ProductNew.findById(item.product);
        if (!product) {
          console.log(`  ⚠️  产品未找到: ${item.product}`);
          continue;
        }

        console.log(`  📦 恢复产品: ${product.name}`);

        // 恢复库存数量
        const originalStock = product.stockQuantity;
        product.stockQuantity += item.quantity;
        console.log(`     库存: ${originalStock} → ${product.stockQuantity} (+${item.quantity})`);

        // 恢复序列号状态（如果有）
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          for (const soldSerial of item.serialNumbers) {
            const serialEntry = product.serialNumbers.find(
              sn => sn.serialNumber === soldSerial
            );
            
            if (serialEntry) {
              const oldStatus = serialEntry.status;
              serialEntry.status = 'available';
              console.log(`     序列号 ${soldSerial}: ${oldStatus} → available`);
              restoredSerialNumbers++;
            } else {
              console.log(`     ⚠️  序列号未找到: ${soldSerial}`);
            }
          }
        }

        await product.save();
        restoredProducts++;
      }
    }

    // 3. 删除所有销售记录
    const deleteResult = await SalesInvoice.deleteMany({});
    console.log(`\n🗑️  删除了 ${deleteResult.deletedCount} 条销售记录`);

    console.log('\n✅ 操作完成！');
    console.log(`📊 统计信息:`);
    console.log(`   - 恢复的产品数: ${restoredProducts}`);
    console.log(`   - 恢复的序列号数: ${restoredSerialNumbers}`);
    console.log(`   - 删除的销售记录: ${deleteResult.deletedCount}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

clearSalesAndRestoreProducts();
