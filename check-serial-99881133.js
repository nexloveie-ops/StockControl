const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function checkSerial() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const AdminInventory = require('./models/AdminInventory');
    
    console.log('🔍 查询 iPhone 17 的序列号\n');
    
    // 查询两个序列号
    const serials = ['99881022', '99881133'];
    
    for (const serial of serials) {
      console.log(`\n=== 序列号: ${serial} ===`);
      
      const records = await AdminInventory.find({ 
        serialNumber: serial
      }).lean();
      
      if (records.length === 0) {
        console.log(`❌ 未找到记录`);
      } else {
        records.forEach((record, index) => {
          console.log(`\n记录 ${index + 1}:`);
          console.log(`  _id: ${record._id}`);
          console.log(`  产品名称: ${record.productName}`);
          console.log(`  品牌: ${record.brand || '无'}`);
          console.log(`  型号: ${record.model || '无'}`);
          console.log(`  颜色: ${record.color || '无'}`);
          console.log(`  分类: ${record.category}`);
          console.log(`  成色: ${record.condition || '无'}`);
          console.log(`  数量: ${record.quantity}`);
          console.log(`  状态: ${record.status}`);
          console.log(`  销售状态: ${record.salesStatus || '无'}`);
          console.log(`  来源 (source): ${record.source || '未设置'}`);
          console.log(`  供应商 (supplier): ${record.supplier || '未设置'}`);
          console.log(`  发票号 (invoiceNumber): ${record.invoiceNumber || '未设置'}`);
          console.log(`  位置 (location): ${record.location || '未设置'}`);
          console.log(`  进货价: €${record.costPrice}`);
          console.log(`  批发价: €${record.wholesalePrice}`);
          console.log(`  零售价: €${record.retailPrice}`);
          console.log(`  税务分类: ${record.taxClassification || '未设置'}`);
          console.log(`  创建时间: ${record.createdAt}`);
          console.log(`  更新时间: ${record.updatedAt}`);
          
          // 分析入库记录问题
          console.log(`\n  📋 入库记录分析:`);
          
          if (!record.source || record.source === '') {
            console.log(`    ❌ 问题: source 字段为空或未设置`);
            console.log(`    💡 这会导致前端无法显示入库记录`);
            console.log(`    🔧 建议: 应该设置为 'manual'、'invoice' 或 'batch'`);
          } else {
            console.log(`    ✅ source: ${record.source}`);
          }
          
          if (!record.invoiceNumber || record.invoiceNumber === '') {
            console.log(`    ⚠️  invoiceNumber 字段为空`);
            console.log(`    💡 手动入库的产品应该有发票号`);
          } else {
            console.log(`    ✅ invoiceNumber: ${record.invoiceNumber}`);
          }
          
          if (!record.supplier || record.supplier === '') {
            console.log(`    ⚠️  supplier 字段为空`);
            console.log(`    💡 应该记录供应商信息`);
          } else {
            console.log(`    ✅ supplier: ${record.supplier}`);
          }
        });
      }
    }
    
    // 也查询一下 iPhone 17 的所有记录
    console.log('\n\n🔍 查询所有 iPhone 17 的记录\n');
    
    const allIphone17 = await AdminInventory.find({ 
      productName: { $regex: 'iPhone 17', $options: 'i' }
    }).lean();
    
    console.log(`找到 ${allIphone17.length} 条 iPhone 17 记录:\n`);
    
    allIphone17.forEach((record, index) => {
      console.log(`${index + 1}. 序列号: ${record.serialNumber || '无'}, 颜色: ${record.color || '无'}, 来源: ${record.source || '未设置'}, 发票号: ${record.invoiceNumber || '未设置'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkSerial();
