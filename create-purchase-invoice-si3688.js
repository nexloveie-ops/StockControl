const mongoose = require('mongoose');
require('dotenv').config();

async function createPurchaseInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    const PurchaseInvoice = require('./models/PurchaseInvoice');
    const AdminInventory = require('./models/AdminInventory');
    const SupplierNew = require('./models/SupplierNew');
    const ProductNew = require('./models/ProductNew');
    const UserNew = require('./models/UserNew');
    
    const invoiceNumber = 'SI-3688';
    
    // 1. 检查是否已存在
    const existing = await PurchaseInvoice.findOne({ invoiceNumber });
    if (existing) {
      console.log('⚠️  发票已存在，删除旧记录...');
      await PurchaseInvoice.deleteOne({ invoiceNumber });
    }
    
    // 2. 获取AdminInventory产品
    const adminProducts = await AdminInventory.find({ invoiceNumber }).lean();
    console.log(`\n找到 ${adminProducts.length} 个产品`);
    
    if (adminProducts.length === 0) {
      console.log('❌ 未找到产品');
      return;
    }
    
    // 3. 获取供货商
    const supplierName = adminProducts[0].supplier;
    const supplier = await SupplierNew.findOne({ name: supplierName });
    
    if (!supplier) {
      console.log(`❌ 未找到供货商: ${supplierName}`);
      return;
    }
    
    console.log(`✅ 找到供货商: ${supplier.name}`);
    
    // 4. 获取系统用户
    const systemUser = await UserNew.findOne({ username: 'admin' });
    if (!systemUser) {
      console.log('❌ 未找到系统用户');
      return;
    }
    
    // 5. 创建items
    const items = [];
    let subtotal = 0;
    
    for (const adminProduct of adminProducts) {
      // 查找对应的ProductNew
      const product = await ProductNew.findOne({
        'serialNumbers.serialNumber': adminProduct.serialNumber
      });
      
      if (!product) {
        console.log(`⚠️  未找到ProductNew: ${adminProduct.serialNumber}`);
        continue;
      }
      
      const itemCost = adminProduct.costPrice;
      subtotal += itemCost;
      
      items.push({
        product: product._id,
        description: `${adminProduct.productName} - ${adminProduct.model} - ${adminProduct.color}`,
        quantity: 1,
        unitCost: itemCost,
        totalCost: itemCost,
        vatRate: 'Margin VAT',
        taxAmount: 0,
        serialNumbers: [adminProduct.serialNumber]
      });
    }
    
    console.log(`\n创建 ${items.length} 个items`);
    console.log(`小计: €${subtotal.toFixed(2)}`);
    
    // 6. 创建PurchaseInvoice
    const invoice = new PurchaseInvoice({
      invoiceNumber: invoiceNumber,
      supplier: supplier._id,
      invoiceDate: adminProducts[0].createdAt,
      dueDate: new Date(adminProducts[0].createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      currency: 'EUR',
      items: items,
      subtotal: subtotal,
      taxAmount: 0,
      totalAmount: subtotal,
      paymentStatus: 'pending',
      paidAmount: 0,
      status: 'received',
      receivingStatus: 'complete',
      notes: '从AdminInventory自动创建',
      createdBy: systemUser._id
    });
    
    await invoice.save();
    
    console.log(`\n✅ 创建PurchaseInvoice成功`);
    console.log(`   发票号: ${invoice.invoiceNumber}`);
    console.log(`   总金额: €${invoice.totalAmount.toFixed(2)}`);
    console.log(`   产品数: ${invoice.items.length}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

createPurchaseInvoice();
