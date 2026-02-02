const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const ProductNew = require('../models/ProductNew');
const SupplierNew = require('../models/SupplierNew');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const UserNew = require('../models/UserNew');

async function addPurchaseInvoices() {
  try {
    // 连接数据库
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    // 获取现有数据
    const products = await ProductNew.find({ isActive: true });
    const suppliers = await SupplierNew.find({ isActive: true });
    const adminUser = await UserNew.findOne({ role: 'admin' });

    if (!adminUser) {
      console.error('❌ 未找到管理员用户');
      return;
    }

    console.log(`📦 找到 ${products.length} 个产品`);
    console.log(`🏢 找到 ${suppliers.length} 个供应商`);

    // 为每个产品创建进货发票
    const invoices = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const supplier = suppliers[i % suppliers.length]; // 循环使用供应商
      
      // 计算发票金额
      const quantity = Math.max(product.stockQuantity, 1);
      const unitCost = product.costPrice;
      const totalCost = unitCost * quantity;
      
      // 计算税额（假设成本价是含税的）
      let taxRate = 0;
      if (product.vatRate === 'VAT 23%') taxRate = 0.23;
      else if (product.vatRate === 'VAT 13.5%') taxRate = 0.135;
      
      const taxAmount = totalCost * taxRate / (1 + taxRate);
      const subtotal = totalCost - taxAmount;

      const invoice = {
        invoiceNumber: `INV-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
        supplier: supplier._id,
        invoiceDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 随机过去30天内的日期
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后到期
        items: [{
          product: product._id,
          quantity: quantity,
          unitCost: unitCost,
          totalCost: totalCost,
          description: `${product.name} - ${product.condition}`
        }],
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalCost,
        currency: 'EUR',
        paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending', // 70%已付款
        paidAmount: Math.random() > 0.3 ? totalCost : 0,
        status: 'confirmed',
        receivingStatus: 'complete',
        notes: `自动生成的进货发票 - ${product.name}`,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      };

      invoices.push(invoice);
    }

    // 批量插入发票
    const createdInvoices = await PurchaseInvoice.insertMany(invoices);
    console.log(`✅ 成功创建 ${createdInvoices.length} 个进货发票`);

    // 更新产品的进货发票关联
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const invoice = createdInvoices[i];
      
      await ProductNew.findByIdAndUpdate(product._id, {
        $push: { purchaseInvoices: invoice._id }
      });
    }

    console.log('✅ 产品进货发票关联更新完成');

    // 显示统计信息
    const totalInvoices = await PurchaseInvoice.countDocuments();
    const paidInvoices = await PurchaseInvoice.countDocuments({ paymentStatus: 'paid' });
    const pendingInvoices = await PurchaseInvoice.countDocuments({ paymentStatus: 'pending' });
    const totalAmount = await PurchaseInvoice.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    console.log('\n📊 进货发票统计:');
    console.log(`   总发票数: ${totalInvoices}`);
    console.log(`   已付款: ${paidInvoices}`);
    console.log(`   待付款: ${pendingInvoices}`);
    console.log(`   总金额: €${totalAmount[0]?.total?.toFixed(2) || 0}`);

  } catch (error) {
    console.error('❌ 创建进货发票失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  addPurchaseInvoices();
}

module.exports = addPurchaseInvoices;