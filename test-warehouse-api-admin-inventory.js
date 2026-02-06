require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testWarehouseAPIs() {
  console.log('🧪 测试仓库产品API - AdminInventory集成\n');
  
  try {
    // 测试 1: /api/warehouse/products
    console.log('📡 测试 1: GET /api/warehouse/products');
    console.log('=' .repeat(60));
    
    const response1 = await axios.get(`${API_BASE}/warehouse/products`, {
      headers: {
        'Cookie': 'connect.sid=test'
      }
    });
    
    if (response1.data.success) {
      console.log('✅ API 调用成功');
      console.log(`📊 统计信息:`);
      if (response1.data.summary) {
        console.log(`   - ProductNew: ${response1.data.summary.productNew} 个`);
        console.log(`   - AdminInventory: ${response1.data.summary.adminInventory} 个`);
        console.log(`   - 总计: ${response1.data.summary.total} 个`);
      }
      
      // 查找 iPhone Clear Case
      const iPhoneCases = response1.data.data.filter(p => 
        p.name && p.name.includes('iPhone Clear Case')
      );
      
      console.log(`\n🔍 iPhone Clear Case 产品:`);
      if (iPhoneCases.length > 0) {
        console.log(`   找到 ${iPhoneCases.length} 个 iPhone Clear Case 变体`);
        iPhoneCases.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} - ${item.model} - ${item.color}`);
          console.log(`      库存: ${item.quantity}, 价格: €${item.retailPrice}, 来源: ${item.source}`);
        });
        if (iPhoneCases.length > 5) {
          console.log(`   ... 还有 ${iPhoneCases.length - 5} 个变体`);
        }
      } else {
        console.log('   ❌ 未找到 iPhone Clear Case');
      }
    } else {
      console.log('❌ API 返回失败:', response1.data.error);
    }
    
    // 测试 2: /api/merchant/warehouse-products
    console.log('\n\n📡 测试 2: GET /api/merchant/warehouse-products');
    console.log('=' .repeat(60));
    
    const response2 = await axios.get(`${API_BASE}/merchant/warehouse-products`);
    
    if (response2.data.success) {
      console.log('✅ API 调用成功');
      console.log(`📊 统计信息:`);
      if (response2.data.summary) {
        console.log(`   - ProductNew: ${response2.data.summary.productNew} 个`);
        console.log(`   - AdminInventory: ${response2.data.summary.adminInventory} 个`);
        console.log(`   - 产品组: ${response2.data.summary.totalGroups} 组`);
      }
      
      // 查找 iPhone Clear Case 分组
      const iPhoneCaseGroups = response2.data.data.filter(g => 
        g.products && g.products.length > 0 && 
        g.products[0].name && g.products[0].name.includes('iPhone Clear Case')
      );
      
      console.log(`\n🔍 iPhone Clear Case 产品组:`);
      if (iPhoneCaseGroups.length > 0) {
        console.log(`   找到 ${iPhoneCaseGroups.length} 个 iPhone Clear Case 产品组`);
        iPhoneCaseGroups.slice(0, 5).forEach((group, index) => {
          const firstProduct = group.products[0];
          console.log(`   ${index + 1}. ${firstProduct.name || 'Unknown'}`);
          console.log(`      型号: ${group.model}, 颜色: ${group.color}`);
          console.log(`      总库存: ${group.totalAvailable}, 批发价: €${group.wholesalePrice}`);
          console.log(`      来源: ${group.source || 'Unknown'}`);
        });
        if (iPhoneCaseGroups.length > 5) {
          console.log(`   ... 还有 ${iPhoneCaseGroups.length - 5} 个产品组`);
        }
      } else {
        console.log('   ❌ 未找到 iPhone Clear Case 产品组');
      }
    } else {
      console.log('❌ API 返回失败:', response2.data.error);
    }
    
    console.log('\n\n✅ 测试完成！');
    console.log('\n💡 提示:');
    console.log('   - 如果看到 iPhone Clear Case，说明 AdminInventory 集成成功');
    console.log('   - 仓库管理员和商户现在都能看到批量创建的配件变体');
    console.log('   - 刷新浏览器页面即可看到更新后的产品列表');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testWarehouseAPIs();
