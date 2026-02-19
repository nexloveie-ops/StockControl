// 测试合并逻辑

const items = [
  {
    _id: '6995f49584800e3267664884',
    productName: 'iPhone 14',
    color: 'White',
    model: '128GB',
    quantity: 1,
    serialNumber: '35532006'
  },
  {
    _id: '6995f49584800e3267664892',
    productName: 'iPhone 14',
    color: 'White',
    model: '128GB',
    quantity: 1,
    serialNumber: '35532007'
  }
];

const products = [];

items.forEach((item, index) => {
  console.log(`\n处理第 ${index + 1} 个产品:`);
  console.log(`  名称: ${item.productName}, 颜色: ${item.color}, 型号: ${item.model}`);
  
  // 检查是否已有相同颜色和型号的产品
  const existingProduct = products.find(p => 
    p.color === item.color && 
    p.model === item.model &&
    p.name === item.productName
  );
  
  console.log(`  是否找到已存在的产品: ${existingProduct ? '是' : '否'}`);
  
  if (existingProduct) {
    console.log(`  合并到已存在的产品`);
    existingProduct.stockQuantity += item.quantity;
    existingProduct.actualAvailable += item.quantity;
    if (!existingProduct.serialNumbers) {
      existingProduct.serialNumbers = [];
    }
    if (item.serialNumber) {
      existingProduct.serialNumbers.push(item.serialNumber);
    }
  } else {
    console.log(`  创建新产品`);
    const newProduct = {
      _id: item._id,
      name: item.productName,
      color: item.color,
      model: item.model,
      stockQuantity: item.quantity,
      actualAvailable: item.quantity
    };
    
    if (item.serialNumber) {
      newProduct.serialNumbers = [item.serialNumber];
    }
    
    products.push(newProduct);
  }
});

console.log('\n\n最终结果:');
console.log(`总共 ${products.length} 个产品`);
products.forEach((p, i) => {
  console.log(`\n产品 ${i + 1}:`);
  console.log(`  名称: ${p.name}`);
  console.log(`  颜色: ${p.color}`);
  console.log(`  型号: ${p.model}`);
  console.log(`  数量: ${p.stockQuantity}`);
  console.log(`  序列号: ${p.serialNumbers ? p.serialNumbers.join(', ') : 'N/A'}`);
});
