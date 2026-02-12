// 检查SI-001的日期问题
require('dotenv').config();
const mongoose = require('mongoose');

async function debugSI001Date() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');
    
    const AdminInventory = require('./models/AdminInventory');
    
    // 查询SI-001
    const si001Products = await AdminInventory.find({ invoiceNumber: 'SI-001' }).lean();
    
    if (si001Products.length === 0) {
      console.log('❌ 找不到SI-001的产品');
      return;
    }
    
    console.log(`✅ 找到 ${si001Products.length} 个SI-001产品\n`);
    
    // 检查日期
    const firstProduct = si001Products[0];
    console.log('📅 SI-001的日期信息:');
    console.log(`   createdAt: ${firstProduct.createdAt}`);
    console.log(`   createdAt (ISO): ${firstProduct.createdAt.toISOString()}`);
    console.log(`   createdAt (本地): ${firstProduct.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    // 检查是否在查询范围内
    const queryStart = new Date('2026-01-01');
    queryStart.setHours(0, 0, 0, 0);
    
    const queryEnd = new Date('2026-02-28');
    queryEnd.setHours(23, 59, 59, 999);
    
    console.log('\n📊 查询日期范围:');
    console.log(`   开始: ${queryStart.toISOString()}`);
    console.log(`   结束: ${queryEnd.toISOString()}`);
    
    const isInRange = firstProduct.createdAt >= queryStart && firstProduct.createdAt <= queryEnd;
    console.log(`\n${isInRange ? '✅' : '❌'} SI-001 ${isInRange ? '在' : '不在'}查询范围内`);
    
    if (!isInRange) {
      if (firstProduct.createdAt < queryStart) {
        console.log(`   ⚠️  SI-001创建时间早于查询开始日期`);
      } else {
        console.log(`   ⚠️  SI-001创建时间晚于查询结束日期`);
      }
    }
    
    // 显示所有SI-001产品的供货商和其他信息
    console.log('\n📦 SI-001产品详情:');
    console.log(`   供货商: ${firstProduct.supplier}`);
    console.log(`   位置: ${firstProduct.location}`);
    console.log(`   产品名称: ${firstProduct.productName}`);
    
    // 计算总金额
    let totalAmount = 0;
    si001Products.forEach(p => {
      totalAmount += p.costPrice * p.quantity;
    });
    console.log(`   总金额: €${totalAmount.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

debugSI001Date();
