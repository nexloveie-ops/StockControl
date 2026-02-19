const axios = require('axios');

async function checkPreOwnedDevices() {
  try {
    console.log('🔍 检查 Pre-Owned Devices 中已售产品...\n');
    
    // 1. 获取仓库产品API返回的数据
    const response = await axios.get('http://localhost:8080/api/merchant/warehouse-products');
    const result = response.data;
    
    if (!result.success) {
      console.log('❌ API调用失败:', result.error);
      return;
    }
    
    // 找到 Pre-Owned Devices 分类的产品
    const preOwnedGroups = result.data.filter(group => 
      group.category === 'Pre-Owned Devices' || 
      (group.productType && group.productType.toLowerCase().includes('device') && group.category.includes('Pre-Owned'))
    );
    
    console.log(`📱 Pre-Owned Devices 分类: ${preOwnedGroups.length} 个产品组\n`);
    
    for (const group of preOwnedGroups) {
      console.log(`\n产品组: ${group.brand} ${group.model} ${group.color}`);
      console.log(`  总库存: ${group.totalAvailable}`);
      console.log(`  子产品数量: ${group.products.length}`);
      
      for (const product of group.products) {
        console.log(`\n  产品: ${product.name}`);
        console.log(`    _id: ${product._id}`);
        console.log(`    库存数量: ${product.stockQuantity}`);
        console.log(`    实际可用: ${product.actualAvailable}`);
        console.log(`    序列号数量: ${product.serialNumbers?.length || 0}`);
        
        if (product.serialNumbers && product.serialNumbers.length > 0) {
          console.log(`    序列号状态:`);
          product.serialNumbers.forEach(sn => {
            console.log(`      - ${sn.serialNumber}: ${sn.status}`);
          });
          
          // 检查是否有已售的序列号
          const soldSerials = product.serialNumbers.filter(sn => sn.status === 'sold');
          if (soldSerials.length > 0) {
            console.log(`    ⚠️  发现 ${soldSerials.length} 个已售序列号，但产品仍显示在仓库订货列表中！`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

checkPreOwnedDevices();
