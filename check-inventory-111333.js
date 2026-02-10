/**
 * 检查序列号 111333 的库存
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventory111333() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    
    // 1. 精确查找序列号
    console.log('=== 查找序列号 111333 ===');
    let inventory = await MerchantInventory.findOne({
      serialNumber: '111333',
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    if (inventory) {
      console.log('✅ 找到库存记录（精确匹配）');
      console.log(`产品名称: ${inventory.productName}`);
      console.log(`序列号: ${inventory.serialNumber}`);
      console.log(`成色: ${inventory.condition}`);
      console.log(`分类: ${inventory.category}`);
      console.log(`数量: ${inventory.quantity}`);
      console.log(`状态: ${inventory.status}`);
      console.log(`库存ID: ${inventory._id}`);
      console.log('');
    } else {
      console.log('❌ 未找到精确匹配的库存记录');
      console.log('');
      
      // 2. 模糊查找
      console.log('=== 尝试模糊查找 ===');
      const fuzzyResults = await MerchantInventory.find({
        serialNumber: { $regex: '111333', $options: 'i' },
        merchantId: 'MurrayRanelagh'
      }).lean();
      
      if (fuzzyResults.length > 0) {
        console.log(`✅ 找到 ${fuzzyResults.length} 条模糊匹配的记录:`);
        fuzzyResults.forEach((item, index) => {
          console.log(`${index + 1}. ${item.productName} - SN: ${item.serialNumber}`);
        });
      } else {
        console.log('❌ 模糊查找也未找到');
      }
      console.log('');
      
      // 3. 查找包含 111333 的所有序列号
      console.log('=== 查找包含 "111" 的序列号 ===');
      const partialResults = await MerchantInventory.find({
        serialNumber: { $regex: '111', $options: 'i' },
        merchantId: 'MurrayRanelagh'
      }).limit(10).lean();
      
      if (partialResults.length > 0) {
        console.log(`找到 ${partialResults.length} 条记录:`);
        partialResults.forEach((item, index) => {
          console.log(`${index + 1}. ${item.productName} - SN: ${item.serialNumber} - 数量: ${item.quantity}`);
        });
      }
      console.log('');
    }
    
    // 4. 检查搜索功能
    console.log('=== 检查搜索功能 ===');
    
    // 模拟前端搜索逻辑
    const searchTerm = '111333';
    const searchResults = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh',
      $or: [
        { productName: { $regex: searchTerm, $options: 'i' } },
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { barcode: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ]
    }).lean();
    
    console.log(`搜索 "${searchTerm}" 的结果: ${searchResults.length} 条`);
    
    if (searchResults.length > 0) {
      console.log('搜索结果:');
      searchResults.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   序列号: ${item.serialNumber || '无'}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   匹配字段: ${item.serialNumber?.includes(searchTerm) ? '序列号' : item.productName?.includes(searchTerm) ? '产品名称' : '其他'}`);
      });
    } else {
      console.log('❌ 搜索未找到任何结果');
    }
    console.log('');
    
    // 5. 检查是否有数量为0的记录
    console.log('=== 检查数量为0的记录 ===');
    const zeroQtyResults = await MerchantInventory.find({
      serialNumber: { $regex: '111333', $options: 'i' },
      merchantId: 'MurrayRanelagh',
      quantity: 0
    }).lean();
    
    if (zeroQtyResults.length > 0) {
      console.log(`⚠️  找到 ${zeroQtyResults.length} 条数量为0的记录:`);
      zeroQtyResults.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName} - SN: ${item.serialNumber} - 数量: ${item.quantity}`);
      });
      console.log('');
      console.log('💡 提示: 前端搜索可能过滤掉了数量为0的产品');
    } else {
      console.log('未找到数量为0的记录');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

checkInventory111333();
