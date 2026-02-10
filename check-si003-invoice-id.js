require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  try {
    console.log('🔗 连接到 MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');

    // 1. 查找 SI-003 订单
    console.log('📋 查找 SI-003 订单...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const invoice = await PurchaseInvoice.findOne({ 
      invoiceNumber: 'SI-003' 
    }).populate('supplier', 'name').lean();
    
    if (!invoice) {
      console.log('❌ 未找到 SI-003 订单');
      return;
    }
    
    console.log('✅ 找到 SI-003 订单:');
    console.log(`  _id: ${invoice._id}`);
    console.log(`  订单号: ${invoice.invoiceNumber}`);
    console.log(`  供货商: ${invoice.supplier?.name || 'N/A'}`);
    console.log(`  PurchaseInvoice items 数量: ${invoice.items?.length || 0}`);
    
    if (invoice.items && invoice.items.length > 0) {
      console.log('\n  PurchaseInvoice items:');
      invoice.items.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.description || item.productName || 'N/A'} - 数量: ${item.quantity}`);
      });
    }

    // 2. 查找 AdminInventory 中的 SI-003 产品
    console.log('\n\n📦 查找 AdminInventory 中的 SI-003 产品...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const adminProducts = await AdminInventory.find({ 
      invoiceNumber: 'SI-003' 
    }).lean();
    
    console.log(`✅ 找到 ${adminProducts.length} 个 AdminInventory 产品\n`);
    
    if (adminProducts.length > 0) {
      // 按产品名称分组
      const grouped = {};
      adminProducts.forEach(product => {
        const name = product.productName || 'Unknown';
        if (!grouped[name]) {
          grouped[name] = [];
        }
        grouped[name].push(product);
      });
      
      console.log('按产品名称分组:');
      Object.keys(grouped).forEach(productName => {
        const items = grouped[productName];
        console.log(`  ${productName}: ${items.length} 个变体`);
      });
      
      console.log('\n前5个产品示例:');
      adminProducts.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.productName} - ${product.model} - ${product.color}`);
        console.log(`     数量: ${product.quantity}, 价格: €${product.costPrice}`);
      });
    }

    // 3. 测试API调用
    console.log('\n\n🔧 测试 API 返回数据...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`API URL: /api/purchase-orders/${invoice._id}`);
    
    // 模拟API逻辑
    const adminItems = adminProducts.map(product => ({
      _id: product._id,
      description: `${product.productName} - ${product.model} - ${product.color}`,
      quantity: product.quantity,
      unitCost: product.costPrice,
      totalCost: product.costPrice * product.quantity
    }));
    
    const allItems = [
      ...(invoice.items || []),
      ...adminItems
    ];
    
    console.log(`\n合并后的 items 总数: ${allItems.length}`);
    console.log(`  - PurchaseInvoice items: ${invoice.items?.length || 0}`);
    console.log(`  - AdminInventory items: ${adminItems.length}`);

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
