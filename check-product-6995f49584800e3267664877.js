const mongoose = require('mongoose');
require('dotenv').config();

async function checkProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    const productId = '6995f49584800e3267664877';
    
    const product = await AdminInventory.findById(productId);
    
    if (!product) {
      console.log('❌ 产品不存在');
      return;
    }
    
    console.log('📱 产品信息:');
    console.log(`   _id: ${product._id}`);
    console.log(`   产品名称: ${product.productName}`);
    console.log(`   品牌: ${product.brand}`);
    console.log(`   型号: ${product.model}`);
    console.log(`   颜色: ${product.color}`);
    console.log(`   成色: ${product.condition}`);
    console.log(`   序列号: ${product.serialNumber}`);
    console.log(`   数量: ${product.quantity}`);
    console.log(`   状态: ${product.status}`);
    console.log(`   isActive: ${product.isActive}`);
    console.log('');
    
    // 查找所有相同产品名称+型号+成色的记录
    console.log('🔍 查找所有相同产品的记录...\n');
    
    const allDevices = await AdminInventory.find({
      productName: product.productName,
      model: product.model,
      condition: product.condition,
      isActive: true,
      status: 'AVAILABLE',
      quantity: { $gt: 0 },
      serialNumber: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`找到 ${allDevices.length} 个可用设备:\n`);
    
    allDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. _id: ${device._id}`);
      console.log(`     序列号: ${device.serialNumber}`);
      console.log(`     颜色: ${device.color}`);
      console.log(`     数量: ${device.quantity}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkProduct();
