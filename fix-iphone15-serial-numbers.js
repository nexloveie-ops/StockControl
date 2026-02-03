require('dotenv').config();
const mongoose = require('mongoose');
const ProductNew = require('./models/ProductNew');

async function fixIPhone15SerialNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查找 iPhone 15 128GB AB 产品
    const product = await ProductNew.findOne({
      name: 'iPhone 15 128GB AB'
    });

    if (!product) {
      console.log('❌ 未找到 iPhone 15 128GB AB 产品');
      return;
    }

    console.log('📱 找到产品:', product.name);
    console.log('   当前数量:', product.stockQuantity);
    console.log('   当前序列号数量:', product.serialNumbers.length);
    console.log('');

    // 添加两个序列号（根据用户输入的数量应该是2）
    const serialNumbersToAdd = [
      { serialNumber: 'SERIAL001', color: 'Black', status: 'available' },
      { serialNumber: 'SERIAL002', color: 'Black', status: 'available' }
    ];

    // 清空现有序列号并添加新的
    product.serialNumbers = serialNumbersToAdd;
    
    await product.save();

    console.log('✅ 序列号已更新');
    console.log('   新序列号数量:', product.serialNumbers.length);
    product.serialNumbers.forEach((sn, index) => {
      console.log(`   ${index + 1}. ${sn.serialNumber} (${sn.color}) - ${sn.status}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

fixIPhone15SerialNumbers();
