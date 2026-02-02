const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testNewReceivingAPI() {
  try {
    console.log('测试新的入库API（包含序列号和条码）...');
    
    const testData = {
      supplier: {
        name: 'Advanced Tech Supplies',
        address: 'Dublin Tech Park, Ireland',
        phone: '+353-1-555-0123',
        email: 'orders@advancedtech.ie',
        confidence: 94
      },
      products: [
        {
          name: 'iPhone 15 Pro Max',
          brand: 'Apple',
          model: 'A3108',
          quantity: 1,
          unitPrice: 1200.00,
          totalPrice: 1200.00,
          category: '全新设备',
          condition: 'Brand New',
          serialNumber: '359876543210987', // 设备必须有序列号
          vatRate: 'VAT 23%',
          confidence: 96
        },
        {
          name: 'iPhone 15 保护壳',
          brand: 'Generic',
          model: 'IP15-CASE',
          quantity: 50,
          unitPrice: 5.99,
          totalPrice: 299.50,
          category: '手机配件',
          condition: 'Brand New',
          barcode: '1234567890123', // 配件可选条码
          vatRate: 'VAT 23%',
          confidence: 88
        },
        {
          name: 'Samsung Galaxy S23',
          brand: 'Samsung',
          model: 'SM-S911B',
          quantity: 1,
          unitPrice: 650.00,
          totalPrice: 650.00,
          category: '二手设备',
          condition: 'Pre-Owned',
          serialNumber: '358123456789012', // 二手设备也必须有序列号
          vatRate: 'VAT 23%',
          confidence: 91
        },
        {
          name: 'USB-C 数据线',
          brand: 'Anker',
          model: 'A8856',
          quantity: 100,
          unitPrice: 3.50,
          totalPrice: 350.00,
          category: '数据线',
          condition: 'Brand New',
          barcode: '2345678901234', // 配件条码
          vatRate: 'VAT 23%',
          confidence: 89
        }
      ],
      invoiceInfo: {
        number: 'ADV-2026-001',
        date: '2026-02-01',
        dueDate: '2026-03-01',
        currency: 'EUR',
        subtotal: 2499.50,
        tax: 574.89,
        total: 3074.39
      }
    };
    
    console.log('发送请求数据:');
    console.log('- 供应商:', testData.supplier.name);
    console.log('- 产品数量:', testData.products.length);
    testData.products.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.name} (${p.category}) - ${p.serialNumber ? 'SN: ' + p.serialNumber : p.barcode ? '条码: ' + p.barcode : '无标识'}`);
    });
    
    const response = await fetch('http://localhost:3000/api/admin/receiving/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n响应状态:', response.status);
    
    const result = await response.json();
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ 新入库API测试成功');
      console.log(`- 供应商: ${result.data.supplier.name}`);
      console.log(`- 新增产品: ${result.data.productsCreated}`);
      console.log(`- 更新产品: ${result.data.productsUpdated}`);
      
      // 验证产品是否正确创建
      console.log('\n验证产品创建...');
      const productsResponse = await fetch('http://localhost:3000/api/products');
      const productsResult = await productsResponse.json();
      
      if (productsResult.success) {
        const newProducts = productsResult.data.filter(p => 
          testData.products.some(tp => tp.name === p.name)
        );
        console.log(`找到 ${newProducts.length} 个匹配的产品:`);
        newProducts.forEach(p => {
          console.log(`- ${p.name}: 库存=${p.stockQuantity}, SKU=${p.sku}, 序列号=${p.serialNumbers?.length || 0}个`);
        });
      }
      
    } else {
      console.log('❌ 新入库API测试失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testNewReceivingAPI();