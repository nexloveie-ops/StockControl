const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWholesalePriceAPI() {
  try {
    console.log('测试批发价入库API...');
    
    const testData = {
      supplier: {
        name: 'Wholesale Tech Supplies',
        address: 'Dublin Wholesale District, Ireland',
        phone: '+353-1-555-9999',
        email: 'wholesale@techsupplies.ie',
        confidence: 96
      },
      products: [
        {
          name: 'iPhone 15 Pro 保护壳 - 批发测试',
          brand: 'Generic',
          model: 'IP15-CASE-WS',
          quantity: 100,
          unitPrice: 5.00, // 进货价
          wholesalePrice: 6.50, // 批发价
          totalPrice: 500.00,
          category: '手机配件',
          condition: 'Brand New',
          barcode: '9876543210123',
          vatRate: 'VAT 23%',
          confidence: 94
        },
        {
          name: 'Samsung Galaxy S24 Ultra',
          brand: 'Samsung',
          model: 'SM-S928B',
          quantity: 2,
          unitPrice: 800.00, // 进货价
          wholesalePrice: 900.00, // 批发价
          totalPrice: 1600.00,
          category: '全新设备',
          condition: 'Brand New',
          serialNumber: '358987654321098',
          vatRate: 'VAT 23%',
          confidence: 98
        },
        {
          name: 'USB-C 快充数据线 - 批发装',
          brand: 'Anker',
          model: 'A8857-WS',
          quantity: 200,
          unitPrice: 2.50, // 进货价
          wholesalePrice: 3.25, // 批发价
          totalPrice: 500.00,
          category: '数据线',
          condition: 'Brand New',
          barcode: '8765432109876',
          vatRate: 'VAT 23%',
          confidence: 92
        }
      ],
      invoiceInfo: {
        number: 'WS-2026-001',
        date: '2026-02-01',
        dueDate: '2026-03-01',
        currency: 'EUR',
        subtotal: 2600.00,
        tax: 598.00,
        total: 3198.00
      }
    };
    
    console.log('发送批发价测试数据:');
    console.log('- 供应商:', testData.supplier.name);
    console.log('- 产品数量:', testData.products.length);
    testData.products.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.name}`);
      console.log(`     进货价: €${p.unitPrice} | 批发价: €${p.wholesalePrice} | 利润率: ${(((p.wholesalePrice - p.unitPrice) / p.unitPrice) * 100).toFixed(1)}%`);
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
      console.log('\n✅ 批发价入库API测试成功');
      console.log(`- 供应商: ${result.data.supplier.name}`);
      console.log(`- 新增产品: ${result.data.productsCreated}`);
      console.log(`- 更新产品: ${result.data.productsUpdated}`);
      
      // 验证产品是否正确创建并包含批发价
      console.log('\n验证产品批发价设置...');
      const productsResponse = await fetch('http://localhost:3000/api/products');
      const productsResult = await productsResponse.json();
      
      if (productsResult.success) {
        const testProducts = productsResult.data.filter(p => 
          testData.products.some(tp => tp.name === p.name)
        );
        console.log(`找到 ${testProducts.length} 个测试产品:`);
        testProducts.forEach(p => {
          const originalProduct = testData.products.find(tp => tp.name === p.name);
          console.log(`- ${p.name}:`);
          console.log(`  进货价: €${p.costPrice || 0} (期望: €${originalProduct.unitPrice})`);
          console.log(`  批发价: €${p.retailPrice || 0} (期望: €${originalProduct.wholesalePrice})`);
          console.log(`  库存: ${p.stockQuantity}, SKU: ${p.sku}`);
        });
      }
      
    } else {
      console.log('❌ 批发价入库API测试失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testWholesalePriceAPI();