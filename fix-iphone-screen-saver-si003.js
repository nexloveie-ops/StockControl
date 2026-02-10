require('dotenv').config();
const mongoose = require('mongoose');

async function fixData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');

    // 1. 查找所有 iPhone Screen Saver 产品
    console.log('📱 查找 iPhone Screen Saver 产品...');
    const products = await AdminInventory.find({ 
      productName: /iPhone Screen Saver/i
    }).limit(5);  // 只查看前5个
    
    console.log(`找到 ${products.length} 个产品（显示前5个）\n`);
    
    products.forEach((product, index) => {
      console.log(`产品 ${index + 1}:`);
      console.log(`  invoiceNumber: "${product.invoiceNumber}" (type: ${typeof product.invoiceNumber})`);
      console.log(`  supplier: "${product.supplier}" (type: ${typeof product.supplier})`);
      console.log(`  location: "${product.location}" (type: ${typeof product.location})`);
      console.log(`  source: "${product.source}"`);
      console.log('');
    });
    
    // 查找需要更新的产品
    const productsToUpdate = await AdminInventory.find({ 
      productName: /iPhone Screen Saver/i,
      $or: [
        { invoiceNumber: { $exists: false } },
        { invoiceNumber: '' },
        { invoiceNumber: null },
        { invoiceNumber: undefined }
      ]
    });
    
    console.log(`需要更新的产品数: ${productsToUpdate.length}\n`);
    
    if (productsToUpdate.length === 0) {
      console.log('✅ 没有需要更新的产品');
      console.log('   所有产品可能已经有 invoiceNumber 字段（即使值为空字符串）');
      console.log('   尝试查找 invoiceNumber 为空字符串的产品...\n');
      
      const emptyInvoiceProducts = await AdminInventory.find({ 
        productName: /iPhone Screen Saver/i,
        invoiceNumber: ''
      });
      
      console.log(`找到 ${emptyInvoiceProducts.length} 个 invoiceNumber 为空字符串的产品`);
      
      if (emptyInvoiceProducts.length > 0) {
        console.log('   将更新这些产品...\n');
        
        const updateData = {
          invoiceNumber: 'SI-003',
          supplier: 'Mobigo Limited',
          location: 'Warehouse A',
          source: 'invoice'
        };
        
        const result = await AdminInventory.updateMany(
          { 
            productName: /iPhone Screen Saver/i,
            invoiceNumber: ''
          },
          { $set: updateData }
        );
        
        console.log(`✅ 更新完成:`);
        console.log(`   匹配的产品数: ${result.matchedCount}`);
        console.log(`   修改的产品数: ${result.modifiedCount}`);
      }
      
      return;
    }

    // 2. 查找 SI-003 订单
    const invoice = await PurchaseInvoice.findOne({ invoiceNumber: 'SI-003' });
    
    if (!invoice) {
      console.log('❌ 未找到 SI-003 订单，无法更新产品');
      return;
    }
    
    console.log(`✅ 找到 SI-003 订单 (供货商: ${invoice.supplier})\n`);

    // 3. 更新所有产品
    console.log('🔄 开始更新产品...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const updateData = {
      invoiceNumber: 'SI-003',
      supplier: 'Mobigo Limited',
      location: 'Warehouse A',
      source: 'invoice'
    };
    
    const result = await AdminInventory.updateMany(
      { 
        productName: /iPhone Screen Saver/i,
        $or: [
          { invoiceNumber: { $exists: false } },
          { invoiceNumber: '' },
          { invoiceNumber: null }
        ]
      },
      { $set: updateData }
    );
    
    console.log(`✅ 更新完成:`);
    console.log(`   匹配的产品数: ${result.matchedCount}`);
    console.log(`   修改的产品数: ${result.modifiedCount}`);
    
    // 4. 验证更新结果
    console.log('\n\n📊 验证更新结果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const verifyProducts = await AdminInventory.find({ 
      productName: /iPhone Screen Saver/i 
    });
    
    const withInvoice = verifyProducts.filter(p => p.invoiceNumber === 'SI-003');
    const withoutInvoice = verifyProducts.filter(p => !p.invoiceNumber || p.invoiceNumber === '');
    
    console.log(`iPhone Screen Saver 产品总数: ${verifyProducts.length}`);
    console.log(`已关联到 SI-003: ${withInvoice.length}`);
    console.log(`未关联订单: ${withoutInvoice.length}`);
    
    if (withInvoice.length > 0) {
      console.log('\n✅ 成功关联的产品示例:');
      const sample = withInvoice[0];
      console.log(`   产品: ${sample.productName}`);
      console.log(`   型号: ${sample.model}`);
      console.log(`   颜色: ${sample.color}`);
      console.log(`   订单号: ${sample.invoiceNumber}`);
      console.log(`   供货商: ${sample.supplier}`);
      console.log(`   位置: ${sample.location}`);
      console.log(`   来源: ${sample.source}`);
    }
    
    console.log('\n✅ 所有更新完成！');

  } catch (error) {
    console.error('❌ 更新失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

fixData();
