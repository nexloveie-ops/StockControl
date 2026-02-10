require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const AdminInventory = require('./models/AdminInventory');
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const SupplierNew = require('./models/SupplierNew');

    // 1. 查找 iPhone Screen Saver 产品
    console.log('📱 查找 iPhone Screen Saver 产品...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const products = await AdminInventory.find({ 
      productName: /iPhone Screen Saver/i 
    }).lean();
    
    if (products.length === 0) {
      console.log('❌ 未找到 iPhone Screen Saver 产品');
    } else {
      console.log(`✅ 找到 ${products.length} 个 iPhone Screen Saver 产品:\n`);
      products.forEach((product, index) => {
        console.log(`产品 ${index + 1}:`);
        console.log(`  _id: ${product._id}`);
        console.log(`  产品名称: ${product.productName}`);
        console.log(`  型号: ${product.model || 'N/A'}`);
        console.log(`  颜色: ${product.color || 'N/A'}`);
        console.log(`  数量: ${product.quantity}`);
        console.log(`  供货商: ${product.supplier || 'N/A'}`);
        console.log(`  位置: ${product.location || 'N/A'}`);
        console.log(`  订单号: ${product.invoiceNumber || 'N/A'}`);
        console.log(`  来源: ${product.source || 'N/A'}`);
        console.log(`  创建时间: ${product.createdAt}`);
        console.log('');
      });
    }

    // 2. 查找 SI-003 订单
    console.log('\n📋 查找 SI-003 订单...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const invoice = await PurchaseInvoice.findOne({ 
      invoiceNumber: 'SI-003' 
    }).populate('supplier', 'name').lean();
    
    if (!invoice) {
      console.log('❌ 未找到 SI-003 订单');
    } else {
      console.log('✅ 找到 SI-003 订单:\n');
      console.log(`订单号: ${invoice.invoiceNumber}`);
      console.log(`供货商: ${invoice.supplier?.name || invoice.supplier || 'N/A'}`);
      console.log(`供货商ID: ${invoice.supplier?._id || invoice.supplier || 'N/A'}`);
      console.log(`接收日期: ${invoice.receivedDate}`);
      console.log(`状态: ${invoice.status}`);
      console.log(`总金额: €${invoice.totalAmount || 0}`);
      console.log(`备注: ${invoice.notes || 'N/A'}`);
      console.log(`\n订单项目数量: ${invoice.items?.length || 0}`);
      
      if (invoice.items && invoice.items.length > 0) {
        console.log('\n订单项目明细:');
        invoice.items.forEach((item, index) => {
          console.log(`\n  项目 ${index + 1}:`);
          console.log(`    产品名称: ${item.productName || 'N/A'}`);
          console.log(`    型号: ${item.model || 'N/A'}`);
          console.log(`    颜色: ${item.color || 'N/A'}`);
          console.log(`    数量: ${item.quantity || 0}`);
          console.log(`    单价: €${item.unitPrice || 0}`);
          console.log(`    总价: €${item.totalPrice || 0}`);
          console.log(`    位置: ${item.location || 'N/A'}`);
        });
      }
    }

    // 3. 查找所有 SI-003 相关的产品
    console.log('\n\n📦 查找所有 invoiceNumber 为 SI-003 的产品...');
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
        items.forEach(item => {
          console.log(`  - ${item.model || 'N/A'} / ${item.color || 'N/A'} (数量: ${item.quantity})`);
        });
      });
    }

    // 4. 检查是否有 iPhone Screen Saver 但订单号不是 SI-003 的
    console.log('\n\n🔍 检查 iPhone Screen Saver 的订单号...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const screenSaverProducts = await AdminInventory.find({ 
      productName: /iPhone Screen Saver/i 
    }).lean();
    
    if (screenSaverProducts.length > 0) {
      const invoiceNumbers = [...new Set(screenSaverProducts.map(p => p.invoiceNumber || 'N/A'))];
      console.log(`iPhone Screen Saver 关联的订单号: ${invoiceNumbers.join(', ')}`);
      
      const notSI003 = screenSaverProducts.filter(p => p.invoiceNumber !== 'SI-003');
      if (notSI003.length > 0) {
        console.log(`\n⚠️  有 ${notSI003.length} 个 iPhone Screen Saver 产品不在 SI-003 订单中:`);
        notSI003.forEach(p => {
          console.log(`  - ${p.model || 'N/A'} / ${p.color || 'N/A'}: 订单号 = ${p.invoiceNumber || 'N/A'}`);
        });
      }
    }

    // 5. 总结
    console.log('\n\n📊 总结');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`iPhone Screen Saver 产品总数: ${products.length}`);
    console.log(`SI-003 订单中的项目数: ${invoice?.items?.length || 0}`);
    console.log(`AdminInventory 中 SI-003 的产品数: ${si003Products.length}`);
    
    if (products.length > 0 && si003Products.length === 0) {
      console.log('\n❌ 问题：iPhone Screen Saver 产品存在，但没有关联到 SI-003 订单');
      console.log('   可能原因：');
      console.log('   1. 创建产品时没有填写订单号');
      console.log('   2. 填写的订单号不是 SI-003');
      console.log('   3. 订单号字段拼写错误');
    }

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
