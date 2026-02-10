/**
 * 完整测试退款流程
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testCompleteRefundFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const MerchantInventory = require('./models/MerchantInventory');
    const ProductCondition = require('./models/ProductCondition');
    
    // 1. 查询 iPhone 11 库存
    console.log('=== 步骤1: 查询 iPhone 11 库存 ===');
    const inventory = await MerchantInventory.findOne({
      productName: /iPhone 11/i,
      merchantId: 'MurrayRanelagh'
    }).lean();
    
    if (!inventory) {
      console.log('❌ 没有找到 iPhone 11 库存');
      return;
    }
    
    console.log(`产品: ${inventory.productName}`);
    console.log(`condition 字段: ${inventory.condition}`);
    console.log(`category 字段: ${inventory.category}`);
    console.log('');
    
    // 2. 模拟销售时保存的 originalCondition
    console.log('=== 步骤2: 模拟销售 ===');
    const originalCondition = inventory.condition; // 这是销售时保存的值
    console.log(`保存的 originalCondition: ${originalCondition}`);
    console.log('');
    
    // 3. 模拟退款时的判断逻辑
    console.log('=== 步骤3: 退款时判断 ===');
    const isBrandNew = originalCondition === 'Brand New' || 
                       originalCondition === '全新' || 
                       originalCondition === 'BRAND NEW';
    console.log(`isBrandNew: ${isBrandNew}`);
    console.log('');
    
    // 4. 加载成色列表
    console.log('=== 步骤4: 加载成色列表 ===');
    const productConditions = await ProductCondition.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
    
    console.log(`成色列表 (${productConditions.length} 个):`);
    productConditions.forEach(cond => {
      console.log(`  - ${cond.name} (code: ${cond.code})`);
    });
    console.log('');
    
    // 5. 过滤成色
    console.log('=== 步骤5: 过滤成色 ===');
    let availableConditions = [];
    if (isBrandNew) {
      console.log('✅ 全新产品 → 显示所有成色');
      availableConditions = productConditions;
    } else {
      console.log('✅ 二手产品 → 过滤掉"全新"');
      availableConditions = productConditions.filter(cond => {
        const condName = cond.name.toLowerCase();
        const condCode = (cond.code || '').toUpperCase();
        const shouldKeep = condName !== 'brand new' && 
                          condName !== '全新' && 
                          condCode !== 'BRAND NEW' &&
                          condCode !== 'BRAND_NEW';
        
        if (!shouldKeep) {
          console.log(`  ❌ 过滤掉: ${cond.name} (code: ${cond.code})`);
        }
        
        return shouldKeep;
      });
    }
    
    console.log('');
    console.log(`可选成色 (${availableConditions.length} 个):`);
    availableConditions.forEach(cond => {
      console.log(`  - ${cond.name}`);
    });
    console.log('');
    
    // 6. 验证结果
    console.log('=== 步骤6: 验证结果 ===');
    const hasQuanXin = availableConditions.some(c => c.name === '全新');
    const hasBrandNew = availableConditions.some(c => c.name.toLowerCase() === 'brand new');
    
    if (originalCondition === 'BRAND NEW' || originalCondition === 'Brand New' || originalCondition === '全新') {
      // 全新产品
      if (hasQuanXin || hasBrandNew || availableConditions.length === productConditions.length) {
        console.log('✅ 测试通过：全新产品显示所有成色');
      } else {
        console.log('❌ 测试失败：全新产品应该显示所有成色');
      }
    } else {
      // 二手产品
      if (!hasQuanXin && !hasBrandNew) {
        console.log('✅ 测试通过：二手产品不显示"全新"');
      } else {
        console.log('❌ 测试失败：二手产品不应该显示"全新"');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

testCompleteRefundFlow();
