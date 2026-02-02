const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testReceivingAPI() {
  try {
    console.log('测试入库API...');
    
    const testData = {
      supplier: {
        name: 'Test Supplier Ltd',
        address: 'Test Address, Ireland',
        phone: '+353-1-123-4567',
        email: 'test@supplier.com',
        confidence: 95
      },
      products: [
        {
          name: 'Test Product 1',
          brand: 'TestBrand',
          model: 'TM001',
          quantity: 10,
          unitPrice: 25.99,
          totalPrice: 259.90,
          category: '手机配件',
          vatRate: 'VAT 23%',
          confidence: 90
        },
        {
          name: 'Test Product 2',
          brand: 'TestBrand',
          model: 'TM002',
          quantity: 5,
          unitPrice: 45.99,
          totalPrice: 229.95,
          category: '数据线',
          vatRate: 'VAT 23%',
          confidence: 88
        }
      ],
      invoiceInfo: {
        number: 'TEST-INV-001',
        date: '2026-02-01',
        dueDate: '2026-03-01',
        currency: 'EUR',
        subtotal: 489.85,
        tax: 112.66,
        total: 602.51
      }
    };
    
    console.log('发送请求数据:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/admin/receiving/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('响应状态:', response.status);
    
    const result = await response.json();
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 入库API测试成功');
      console.log(`- 供应商: ${result.data.supplier.name}`);
      console.log(`- 新增产品: ${result.data.productsCreated}`);
      console.log(`- 更新产品: ${result.data.productsUpdated}`);
    } else {
      console.log('❌ 入库API测试失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testReceivingAPI();