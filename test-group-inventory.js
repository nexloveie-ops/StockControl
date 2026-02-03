require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');
const MerchantInventory = require('./models/MerchantInventory');

async function testGroupInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');
    
    // 测试 MurrayRanelagh 查看群组库存
    const username = 'MurrayRanelagh';
    console.log(`\n=== 测试用户: ${username} ===`);
    
    // 获取用户信息
    const user = await UserNew.findOne({ username });
    console.log(`用户角色: ${user.role}`);
    console.log(`店面组 ID: ${user.retailInfo?.storeGroup}`);
    console.log(`可查看群组库存: ${user.retailInfo?.canViewGroupInventory}`);
    
    // 模拟中间件逻辑
    const storeGroup = user.retailInfo?.storeGroup;
    const canViewGroup = user.retailInfo?.canViewGroupInventory === true;
    
    if (canViewGroup && storeGroup) {
      console.log(`\n✅ 用户有权限查看群组 ${storeGroup} 的库存`);
      
      // 查询群组库存（排除自己的）
      const query = {
        storeGroup: storeGroup,
        status: 'active',
        isActive: true,
        quantity: { $gt: 0 },
        merchantId: { $ne: username } // 排除自己
      };
      
      console.log('\n查询条件:', JSON.stringify(query, null, 2));
      
      const inventory = await MerchantInventory.find(query);
      
      console.log(`\n找到 ${inventory.length} 条群组库存记录:`);
      
      // 按商户分组显示
      const byMerchant = {};
      inventory.forEach(item => {
        if (!byMerchant[item.merchantId]) {
          byMerchant[item.merchantId] = [];
        }
        byMerchant[item.merchantId].push(item);
      });
      
      Object.keys(byMerchant).forEach(merchantId => {
        console.log(`\n商户: ${merchantId}`);
        byMerchant[merchantId].forEach(item => {
          console.log(`  - ${item.productName} (${item.category})`);
          console.log(`    数量: ${item.quantity}, 零售价: €${item.retailPrice}`);
          console.log(`    序列号: ${item.serialNumber || '无'}`);
        });
      });
      
      // 按分类统计
      console.log('\n=== 按分类统计 ===');
      const byCategory = {};
      inventory.forEach(item => {
        const cat = item.category || '未分类';
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, qty: 0, merchants: new Set() };
        }
        byCategory[cat].count++;
        byCategory[cat].qty += item.quantity;
        byCategory[cat].merchants.add(item.merchantId);
      });
      
      Object.keys(byCategory).forEach(cat => {
        const info = byCategory[cat];
        console.log(`${cat}: ${info.count} 种产品, ${info.qty} 件库存, ${info.merchants.size} 个商户`);
      });
      
    } else {
      console.log('❌ 用户没有权限查看群组库存');
    }
    
    // 同时查看自己的库存
    console.log(`\n=== ${username} 自己的库存 ===`);
    const myInventory = await MerchantInventory.find({
      merchantId: username,
      status: 'active',
      isActive: true
    });
    console.log(`自己的库存: ${myInventory.length} 条记录`);
    myInventory.forEach(item => {
      console.log(`  - ${item.productName} (${item.category}), 数量: ${item.quantity}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testGroupInventory();
