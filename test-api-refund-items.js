const http = require('http');

async function testAPIRefundItems() {
  try {
    console.log('🔍 测试销售记录API是否返回refundItems字段\n');
    
    const startDate = '2026-02-10';
    const endDate = '2026-02-10';
    const merchantId = 'MurrayRanelagh';
    
    const path = `/api/merchant/sales?merchantId=${merchantId}&startDate=${startDate}&endDate=${endDate}`;
    
    console.log(`📡 请求路径: ${path}\n`);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };
    
    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
    
    if (!result.success) {
      console.log('❌ API请求失败:', result.error);
      return;
    }
    
    console.log(`✅ 获取到 ${result.data.length} 条销售记录\n`);
    
    // 查找订单 698abab1ea107400f2c00d2c
    const targetOrder = result.data.find(sale => 
      sale._id === '698abab1ea107400f2c00d2c'
    );
    
    if (!targetOrder) {
      console.log('❌ 未找到目标订单 698abab1ea107400f2c00d2c');
      console.log('\n可用的订单:');
      result.data.forEach(sale => {
        console.log(`  - ${sale._id} (${sale.items.length} 件商品)`);
      });
      return;
    }
    
    console.log('📋 订单 698abab1ea107400f2c00d2c 详情:');
    console.log('='.repeat(80));
    console.log(`订单ID: ${targetOrder._id}`);
    console.log(`状态: ${targetOrder.status}`);
    console.log(`总金额: €${targetOrder.totalAmount}`);
    console.log(`\n商品列表 (${targetOrder.items.length} 件):`);
    
    targetOrder.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.productName}`);
      console.log(`     价格: €${item.price}`);
      console.log(`     序列号: ${item.serialNumber || 'N/A'}`);
    });
    
    console.log(`\nrefundItems 字段:`);
    if (targetOrder.refundItems) {
      console.log(`  ✅ 存在 (${targetOrder.refundItems.length} 件退款商品)`);
      targetOrder.refundItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName}`);
        console.log(`     价格: €${item.price}`);
        console.log(`     序列号: ${item.serialNumber || 'N/A'}`);
      });
    } else {
      console.log(`  ❌ 不存在或为空`);
    }
    
    console.log(`\nrefundDate: ${targetOrder.refundDate || 'N/A'}`);
    console.log(`refundAmount: ${targetOrder.refundAmount ? '€' + targetOrder.refundAmount : 'N/A'}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 匹配测试:');
    console.log('='.repeat(80));
    
    if (targetOrder.refundItems && targetOrder.refundItems.length > 0) {
      targetOrder.items.forEach((item, index) => {
        const isRefunded = targetOrder.refundItems.some(refundItem => {
          if (item.serialNumber && refundItem.serialNumber) {
            return item.serialNumber === refundItem.serialNumber;
          }
          return refundItem.productName === item.productName && 
                 refundItem.price === item.price;
        });
        
        console.log(`\n商品 ${index + 1}: ${item.productName}`);
        console.log(`  序列号: ${item.serialNumber || 'N/A'}`);
        console.log(`  退款状态: ${isRefunded ? '❌ 已退款' : '✅ 正常'}`);
        console.log(`  预期显示: ${isRefunded ? '🔴 红色背景' : '⚪ 白色背景'}`);
      });
    } else {
      console.log('⚠️  refundItems 为空，无法进行匹配测试');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPIRefundItems();
