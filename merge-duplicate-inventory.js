require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

async function mergeDuplicateInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const MerchantInventory = require('./models/MerchantInventory');
    
    // 查找所有库存记录
    const allRecords = await MerchantInventory.find({}).lean();
    
    console.log(`总共找到 ${allRecords.length} 条库存记录\n`);
    
    // 按照关键字段分组（相同产品应该合并）
    const groupMap = {};
    
    allRecords.forEach(record => {
      // 生成唯一键：商户+产品名+品牌+型号+颜色+成色+成本价+批发价+零售价+来源订单
      const key = [
        record.merchantId,
        record.productName,
        record.brand || '',
        record.model || '',
        record.color || '',
        record.condition || '',
        record.costPrice,
        record.wholesalePrice,
        record.retailPrice,
        record.sourceOrderId?.toString() || '',
        record.source
      ].join('|');
      
      if (!groupMap[key]) {
        groupMap[key] = [];
      }
      groupMap[key].push(record);
    });
    
    console.log('=== 分组结果 ===');
    let duplicateGroups = 0;
    let totalDuplicates = 0;
    
    for (const [key, records] of Object.entries(groupMap)) {
      if (records.length > 1) {
        duplicateGroups++;
        totalDuplicates += records.length - 1;
        
        const sample = records[0];
        console.log(`\n${duplicateGroups}. ${sample.productName} (${sample.merchantName || sample.merchantId})`);
        console.log(`   品牌/型号: ${sample.brand || '-'} ${sample.model || '-'}`);
        console.log(`   颜色: ${sample.color || '-'}`);
        console.log(`   重复记录数: ${records.length}`);
        console.log(`   总数量: ${records.reduce((sum, r) => sum + r.quantity, 0)}`);
        console.log(`   来源: ${sample.source}`);
        console.log(`   来源订单: ${sample.sourceOrderId || '无'}`);
      }
    }
    
    console.log(`\n=== 统计 ===`);
    console.log(`发现 ${duplicateGroups} 组重复记录`);
    console.log(`需要合并 ${totalDuplicates} 条重复记录\n`);
    
    if (duplicateGroups === 0) {
      console.log('✅ 没有发现重复记录');
      return;
    }
    
    // 执行合并
    console.log('开始合并重复记录...\n');
    let mergedCount = 0;
    
    for (const [key, records] of Object.entries(groupMap)) {
      if (records.length > 1) {
        // 计算总数量
        const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
        
        // 保留第一条记录，更新数量
        const keepRecord = records[0];
        await MerchantInventory.findByIdAndUpdate(keepRecord._id, {
          quantity: totalQuantity
        });
        
        // 删除其他记录
        const deleteIds = records.slice(1).map(r => r._id);
        await MerchantInventory.deleteMany({ _id: { $in: deleteIds } });
        
        mergedCount++;
        console.log(`✅ 合并: ${keepRecord.productName} - 保留1条，删除${deleteIds.length}条，总数量=${totalQuantity}`);
      }
    }
    
    console.log(`\n✅ 合并完成！共处理 ${mergedCount} 组重复记录`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

mergeDuplicateInventory();
