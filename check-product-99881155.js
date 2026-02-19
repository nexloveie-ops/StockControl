const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkProduct() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    // 导入所有可能的模型
    const AdminInventory = require('./models/AdminInventory');
    const MerchantInventory = require('./models/MerchantInventory');
    const ProductNew = require('./models/ProductNew');

    const serialNumber = '99881155';
    console.log(`🔍 查询序列号: ${serialNumber}\n`);

    // 1. 查询 AdminInventory
    console.log('📦 查询 AdminInventory...');
    const adminProduct = await AdminInventory.findOne({
      $or: [
        { serialNumber: serialNumber },
        { serialNumber: new RegExp(serialNumber, 'i') }
      ]
    });

    if (adminProduct) {
      console.log('✅ 在 AdminInventory 中找到:');
      console.log('  产品名称:', adminProduct.productName);
      console.log('  品牌:', adminProduct.brand);
      console.log('  型号:', adminProduct.model);
      console.log('  颜色:', adminProduct.color);
      console.log('  序列号:', adminProduct.serialNumber);
      console.log('  成色:', adminProduct.condition);
      console.log('  税务分类:', adminProduct.taxClassification);
      console.log('  数量:', adminProduct.quantity);
      console.log('  成本价:', adminProduct.costPrice);
      console.log('  批发价:', adminProduct.wholesalePrice);
      console.log('  零售价:', adminProduct.retailPrice);
      console.log('  状态:', adminProduct.status);
      console.log('  创建时间:', adminProduct.createdAt);
      console.log('  ID:', adminProduct._id);
      console.log('');
    } else {
      console.log('❌ 在 AdminInventory 中未找到\n');
    }

    // 2. 查询 MerchantInventory
    console.log('🏪 查询 MerchantInventory...');
    const merchantProduct = await MerchantInventory.findOne({
      $or: [
        { serialNumber: serialNumber },
        { serialNumber: new RegExp(serialNumber, 'i') }
      ]
    });

    if (merchantProduct) {
      console.log('✅ 在 MerchantInventory 中找到:');
      console.log('  产品名称:', merchantProduct.productName);
      console.log('  品牌:', merchantProduct.brand);
      console.log('  型号:', merchantProduct.model);
      console.log('  颜色:', merchantProduct.color);
      console.log('  序列号:', merchantProduct.serialNumber);
      console.log('  成色:', merchantProduct.condition);
      console.log('  税务分类:', merchantProduct.taxClassification);
      console.log('  数量:', merchantProduct.quantity);
      console.log('  成本价:', merchantProduct.costPrice);
      console.log('  批发价:', merchantProduct.wholesalePrice);
      console.log('  零售价:', merchantProduct.retailPrice);
      console.log('  状态:', merchantProduct.status);
      console.log('  商户ID:', merchantProduct.merchantId);
      console.log('  创建时间:', merchantProduct.createdAt);
      console.log('  ID:', merchantProduct._id);
      console.log('');
    } else {
      console.log('❌ 在 MerchantInventory 中未找到\n');
    }

    // 3. 查询 ProductNew
    console.log('📱 查询 ProductNew...');
    const productNew = await ProductNew.findOne({
      $or: [
        { 'serialNumbers.serialNumber': serialNumber },
        { 'serialNumbers.serialNumber': new RegExp(serialNumber, 'i') }
      ]
    });

    if (productNew) {
      console.log('✅ 在 ProductNew 中找到:');
      console.log('  产品名称:', productNew.name);
      console.log('  品牌:', productNew.brand);
      console.log('  型号:', productNew.model);
      console.log('  SKU:', productNew.sku);
      console.log('  成色:', productNew.condition);
      console.log('  VAT税率:', productNew.vatRate);
      console.log('  成本价:', productNew.costPrice);
      console.log('  零售价:', productNew.retailPrice);
      console.log('  库存数量:', productNew.stockQuantity);
      console.log('  状态:', productNew.status);
      console.log('  序列号列表:');
      productNew.serialNumbers.forEach((sn, index) => {
        if (sn.serialNumber.includes(serialNumber)) {
          console.log(`    [${index}] ${sn.serialNumber} - 状态: ${sn.status}`);
        }
      });
      console.log('  创建时间:', productNew.createdAt);
      console.log('  ID:', productNew._id);
      console.log('');
    } else {
      console.log('❌ 在 ProductNew 中未找到\n');
    }

    // 总结
    console.log('=' .repeat(60));
    console.log('📊 查询总结:');
    console.log('  AdminInventory:', adminProduct ? '✅ 找到' : '❌ 未找到');
    console.log('  MerchantInventory:', merchantProduct ? '✅ 找到' : '❌ 未找到');
    console.log('  ProductNew:', productNew ? '✅ 找到' : '❌ 未找到');
    
    if (adminProduct || merchantProduct || productNew) {
      console.log('\n🏷️ 税务分类信息:');
      if (adminProduct) {
        console.log(`  AdminInventory: ${adminProduct.taxClassification}`);
      }
      if (merchantProduct) {
        console.log(`  MerchantInventory: ${merchantProduct.taxClassification}`);
      }
      if (productNew) {
        console.log(`  ProductNew: ${productNew.vatRate}`);
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkProduct();
