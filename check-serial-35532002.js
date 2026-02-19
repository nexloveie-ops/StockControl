const mongoose = require('mongoose');
require('dotenv').config();

async function checkSerial() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const AdminInventory = require('./models/AdminInventory');
    const ProductNew = require('./models/ProductNew');
    
    const serialNumber = '35532002';
    const merchantId = 'Mobile123';
    
    console.log(`🔍 查询序列号: ${serialNumber}`);
    console.log(`📍 商户: ${merchantId}\n`);
    
    // 1. 查询MerchantInventory
    console.log('=== MerchantInventory ===\n');
    const merchantInventory = await MerchantInventory.find({
      merchantId: merchantId,
      serialNumber: serialNumber
    }).lean();
    
    if (merchantInventory.length > 0) {
      merchantInventory.forEach((item, index) => {
        console.log(`记录 ${index + 1}:`);
        console.log(`  产品名称: ${item.productName}`);
        console.log(`  品牌: ${item.brand}`);
        console.log(`  型号: ${item.model}`);
        console.log(`  颜色: ${item.color}`);
        console.log(`  成色: ${item.condition}`);
        console.log(`  数量: ${item.quantity}`);
        console.log(`  成本价: €${item.costPrice}`);
        console.log(`  批发价: €${item.wholesalePrice}`);
        console.log(`  零售价: €${item.retailPrice}`);
        console.log(`  税务分类: ${item.taxClassification}`);
        console.log(`  状态: ${item.status}`);
        console.log(`  来源: ${item.source}`);
        console.log(`  备注: ${item.notes || '无'}`);
        console.log(`  创建时间: ${item.createdAt}`);
        console.log('');
      });
    } else {
      console.log('  ❌ 未找到记录\n');
    }
    
    // 2. 查询AdminInventory
    console.log('=== AdminInventory ===\n');
    const adminInventory = await AdminInventory.find({
      merchantId: merchantId,
      serialNumber: serialNumber
    }).lean();
    
    if (adminInventory.length > 0) {
      adminInventory.forEach((item, index) => {
        console.log(`记录 ${index + 1}:`);
        console.log(`  产品名称: ${item.productName}`);
        console.log(`  品牌: ${item.brand}`);
        console.log(`  型号: ${item.model}`);
        console.log(`  颜色: ${item.color}`);
        console.log(`  成色: ${item.condition}`);
        console.log(`  数量: ${item.quantity}`);
        console.log(`  成本价: €${item.costPrice}`);
        console.log(`  批发价: €${item.wholesalePrice}`);
        console.log(`  零售价: €${item.retailPrice}`);
        console.log(`  税务分类: ${item.taxClassification}`);
        console.log(`  状态: ${item.status}`);
        console.log(`  供货商: ${item.supplier || '无'}`);
        console.log(`  发票号: ${item.invoiceNumber || '无'}`);
        console.log(`  备注: ${item.notes || '无'}`);
        console.log(`  创建时间: ${item.createdAt}`);
        console.log('');
      });
    } else {
      console.log('  ❌ 未找到记录\n');
    }
    
    // 3. 查询ProductNew
    console.log('=== ProductNew ===\n');
    const products = await ProductNew.find({
      'serialNumbers.serialNumber': serialNumber
    }).lean();
    
    if (products.length > 0) {
      products.forEach((product, index) => {
        const serial = product.serialNumbers.find(sn => sn.serialNumber === serialNumber);
        console.log(`记录 ${index + 1}:`);
        console.log(`  产品名称: ${product.name}`);
        console.log(`  品牌: ${product.brand}`);
        console.log(`  型号: ${product.model}`);
        console.log(`  成色: ${product.condition}`);
        console.log(`  成本价: €${product.costPrice}`);
        console.log(`  批发价: €${product.wholesalePrice || '无'}`);
        console.log(`  零售价: €${product.retailPrice}`);
        console.log(`  VAT税率: ${product.vatRate}`);
        console.log(`  序列号状态: ${serial.status}`);
        console.log(`  序列号添加时间: ${serial.addedAt}`);
        if (serial.soldDate) {
          console.log(`  销售时间: ${serial.soldDate}`);
        }
        console.log(`  创建时间: ${product.createdAt}`);
        console.log('');
      });
    } else {
      console.log('  ❌ 未找到记录\n');
    }
    
    // 4. 查询采购历史（通过发票号）
    console.log('=== 采购历史 ===\n');
    
    // 从AdminInventory或MerchantInventory的notes中提取发票号
    let invoiceNumber = null;
    
    if (adminInventory.length > 0 && adminInventory[0].invoiceNumber) {
      invoiceNumber = adminInventory[0].invoiceNumber;
    } else if (merchantInventory.length > 0 && merchantInventory[0].notes) {
      const match = merchantInventory[0].notes.match(/发票号:\s*([^\s|]+)/i);
      if (match) {
        invoiceNumber = match[1];
      }
    }
    
    if (invoiceNumber) {
      console.log(`  发票号: ${invoiceNumber}`);
      
      // 查询该发票的所有产品
      const invoiceProducts = await AdminInventory.find({
        invoiceNumber: invoiceNumber
      }).lean();
      
      if (invoiceProducts.length > 0) {
        console.log(`  该发票共有 ${invoiceProducts.length} 个产品`);
        console.log(`  供货商: ${invoiceProducts[0].supplier || '未知'}`);
      }
    } else {
      console.log('  ❌ 未找到发票信息');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkSerial();
