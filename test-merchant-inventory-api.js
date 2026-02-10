/**
 * 测试商户库存API，检查是否返回序列号 1113333
 */

const axios = require('axios');

async function testMerchantInventoryAPI() {
  try {
    console.log('=== 测试商户库存API ===\n');
    
    // 调用API
    const response = await axios.get('http://localhost:3000/api/merchant/inventory', {
      params: {
        merchantId: 'MurrayRanelagh'
      }
    });
    
    if (response.data.success) {
      const inventory = response.data.data;
      console.log(`✅ API返回成功，共 ${inventory.length} 条库存记录\n`);
      
      // 查找序列号 1113333
      const target = inventory.find(item => item.serialNumber === '1113333');
      
      if (target) {
        console.log('✅ 找到序列号 1113333:');
        console.log(`产品名称: ${target.productName}`);
        console.log(`序列号: ${target.serialNumber}`);
        console.log(`成色: ${target.condition}`);
        console.log(`分类: ${target.category}`);
        console.log(`数量: ${target.quantity}`);
        console.log(`状态: ${target.status}`);
        console.log('');
      } else {
        console.log('❌ API返回的数据中没有序列号 1113333\n');
        
        // 查找包含 "1113" 的序列号
        const partial = inventory.filter(item => 
          item.serialNumber && item.serialNumber.includes('1113')
        );
        
        if (partial.length > 0) {
          console.log(`找到 ${partial.length} 个包含 "1113" 的序列号:`);
          partial.forEach(item => {
            console.log(`- ${item.productName}: ${item.serialNumber} (数量: ${item.quantity})`);
          });
        } else {
          console.log('也没有找到包含 "1113" 的序列号');
        }
        console.log('');
      }
      
      // 检查数据结构
      if (inventory.length > 0) {
        console.log('=== 数据结构示例 ===');
        const sample = inventory[0];
        console.log('字段列表:');
        Object.keys(sample).forEach(key => {
          console.log(`- ${key}: ${typeof sample[key]}`);
        });
      }
      
    } else {
      console.log('❌ API返回失败:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ API调用失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
}

testMerchantInventoryAPI();
