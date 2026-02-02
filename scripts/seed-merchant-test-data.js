// 批发商户测试数据填充脚本
// 生成30天的销售和维修记录

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/3c-management');
    console.log('✅ MongoDB 连接成功');
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 定义Schema（简化版）
const merchantSaleSchema = new mongoose.Schema({
  merchantId: String,
  date: Date,
  productName: String,
  productType: String, // 'NEW_PHONE', 'NEW_LAPTOP', 'NEW_TABLET', 'USED_PHONE', 'USED_LAPTOP', 'USED_TABLET', 'ACCESSORY'
  category: String, // 'NEW_DEVICE', 'USED_DEVICE', 'ACCESSORY'
  quantity: Number,
  costPrice: Number, // 成本价
  salePrice: Number, // 销售价
  taxClassification: String, // 'VAT_23', 'MARGIN_VAT_0'
  taxAmount: Number,
  paymentMethod: String, // 'CASH', 'CARD'
  createdAt: { type: Date, default: Date.now }
});

const merchantRepairSchema = new mongoose.Schema({
  merchantId: String,
  date: Date,
  customerName: String,
  repairItem: String,
  description: String,
  amount: Number, // 维修金额
  taxAmount: Number, // Service VAT 13.5%
  paymentMethod: String, // 'CASH', 'CARD'
  createdAt: { type: Date, default: Date.now }
});

const MerchantSale = mongoose.model('MerchantSale', merchantSaleSchema);
const MerchantRepair = mongoose.model('MerchantRepair', merchantRepairSchema);

// 产品数据模板
const productTemplates = {
  NEW_PHONE: [
    { name: 'iPhone 15 Pro', cost: 800, retail: 1100 },
    { name: 'Samsung Galaxy S24', cost: 700, retail: 950 },
    { name: 'Google Pixel 8', cost: 600, retail: 850 },
    { name: 'Xiaomi 14', cost: 500, retail: 700 }
  ],
  NEW_LAPTOP: [
    { name: 'MacBook Pro 14"', cost: 1800, retail: 2400 },
    { name: 'Dell XPS 15', cost: 1400, retail: 1900 },
    { name: 'Lenovo ThinkPad X1', cost: 1200, retail: 1650 },
    { name: 'HP Spectre x360', cost: 1100, retail: 1500 }
  ],
  NEW_TABLET: [
    { name: 'iPad Pro 12.9"', cost: 900, retail: 1250 },
    { name: 'Samsung Galaxy Tab S9', cost: 600, retail: 850 },
    { name: 'Microsoft Surface Pro', cost: 800, retail: 1100 }
  ],
  USED_PHONE: [
    { name: 'iPhone 13 Pro (A+)', cost: 450, retail: 650 },
    { name: 'iPhone 12 (A)', cost: 350, retail: 500 },
    { name: 'Samsung S22 (A)', cost: 300, retail: 450 },
    { name: 'iPhone 11 (B)', cost: 250, retail: 380 }
  ],
  USED_LAPTOP: [
    { name: 'MacBook Air 2020 (A+)', cost: 700, retail: 1000 },
    { name: 'Dell XPS 13 2021 (A)', cost: 600, retail: 850 },
    { name: 'ThinkPad T490 (B)', cost: 400, retail: 600 }
  ],
  USED_TABLET: [
    { name: 'iPad Air 2022 (A+)', cost: 400, retail: 600 },
    { name: 'iPad 2021 (A)', cost: 300, retail: 450 },
    { name: 'Galaxy Tab S8 (A)', cost: 350, retail: 500 }
  ],
  ACCESSORY: [
    { name: 'USB-C 充电线', cost: 5, retail: 15 },
    { name: '无线鼠标', cost: 12, retail: 30 },
    { name: '蓝牙耳机', cost: 25, retail: 60 },
    { name: '手机壳', cost: 3, retail: 12 },
    { name: '屏幕保护膜', cost: 2, retail: 10 },
    { name: '笔记本包', cost: 15, retail: 40 },
    { name: '移动电源', cost: 20, retail: 50 },
    { name: 'HDMI线', cost: 8, retail: 25 }
  ]
};

// 维修项目模板
const repairTemplates = [
  { item: '屏幕更换', price: 100 },
  { item: '电池更换', price: 60 },
  { item: '充电口维修', price: 40 },
  { item: '主板维修', price: 150 },
  { item: '摄像头更换', price: 80 },
  { item: '扬声器维修', price: 50 },
  { item: '按键维修', price: 30 },
  { item: '系统重装', price: 25 },
  { item: '数据恢复', price: 120 },
  { item: '清洁保养', price: 20 }
];

const customerNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  'John Smith', 'Maria Garcia', 'David Lee', 'Anna Wang', 'Tom Brown'
];

// 计算税额
function calculateTax(amount, classification) {
  switch (classification) {
    case 'VAT_23':
      return amount * 23 / 123;
    case 'MARGIN_VAT_0':
      return 0;
    case 'SERVICE_VAT_13_5':
      return amount * 13.5 / 113.5;
    default:
      return 0;
  }
}

// 随机选择
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 随机数量（根据产品类型）
function randomQuantity(productType) {
  if (productType === 'ACCESSORY') {
    return Math.floor(Math.random() * 10) + 1; // 1-10
  } else {
    return Math.floor(Math.random() * 3) + 1; // 1-3
  }
}

// 生成销售记录
async function generateSales() {
  const sales = [];
  const merchantId = 'merchant_001';
  const now = new Date();
  
  // 生成30天的数据
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // 每天生成5-15笔销售
    const dailySales = Math.floor(Math.random() * 11) + 5;
    
    for (let i = 0; i < dailySales; i++) {
      // 随机选择产品类型
      const productTypes = ['NEW_PHONE', 'NEW_LAPTOP', 'NEW_TABLET', 'USED_PHONE', 'USED_LAPTOP', 'USED_TABLET', 'ACCESSORY'];
      const productType = randomChoice(productTypes);
      const product = randomChoice(productTemplates[productType]);
      
      // 确定类别和税务分类
      let category, taxClassification;
      if (productType === 'ACCESSORY') {
        category = 'ACCESSORY';
        taxClassification = 'VAT_23';
      } else if (productType.startsWith('NEW_')) {
        category = 'NEW_DEVICE';
        taxClassification = 'VAT_23';
      } else {
        category = 'USED_DEVICE';
        // 二手设备随机使用 VAT_23 或 MARGIN_VAT_0
        taxClassification = Math.random() > 0.5 ? 'VAT_23' : 'MARGIN_VAT_0';
      }
      
      const quantity = randomQuantity(productType);
      const costPrice = product.cost;
      const salePrice = product.retail;
      
      // 计算税额
      let taxAmount;
      if (taxClassification === 'VAT_23') {
        // VAT 23%: 销项税 - 进项税
        const outputTax = salePrice * quantity * 23 / 123;
        const inputTax = costPrice * quantity * 23 / 123;
        taxAmount = outputTax - inputTax;
      } else if (taxClassification === 'MARGIN_VAT_0') {
        // Margin VAT: (销售价 - 成本价) * 23/123
        taxAmount = (salePrice - costPrice) * quantity * 23 / 123;
      }
      
      const paymentMethod = Math.random() > 0.4 ? 'CARD' : 'CASH';
      
      // 添加一些时间随机性
      const saleDate = new Date(date);
      saleDate.setHours(Math.floor(Math.random() * 12) + 9); // 9-21点
      saleDate.setMinutes(Math.floor(Math.random() * 60));
      
      sales.push({
        merchantId,
        date: saleDate,
        productName: product.name,
        productType,
        category,
        quantity,
        costPrice,
        salePrice,
        taxClassification,
        taxAmount,
        paymentMethod,
        createdAt: saleDate
      });
    }
  }
  
  console.log(`📦 生成 ${sales.length} 条销售记录`);
  return sales;
}

// 生成维修记录
async function generateRepairs() {
  const repairs = [];
  const merchantId = 'merchant_001';
  const now = new Date();
  
  // 生成30天的数据
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // 每天生成2-6笔维修
    const dailyRepairs = Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < dailyRepairs; i++) {
      const repair = randomChoice(repairTemplates);
      const customerName = randomChoice(customerNames);
      const amount = repair.price;
      const taxAmount = amount * 13.5 / 113.5; // Service VAT 13.5%
      const paymentMethod = Math.random() > 0.5 ? 'CARD' : 'CASH';
      
      // 添加一些时间随机性
      const repairDate = new Date(date);
      repairDate.setHours(Math.floor(Math.random() * 12) + 9);
      repairDate.setMinutes(Math.floor(Math.random() * 60));
      
      repairs.push({
        merchantId,
        date: repairDate,
        customerName,
        repairItem: repair.item,
        description: `${repair.item}服务`,
        amount,
        taxAmount,
        paymentMethod,
        createdAt: repairDate
      });
    }
  }
  
  console.log(`🔧 生成 ${repairs.length} 条维修记录`);
  return repairs;
}

// 主函数
async function main() {
  console.log('🚀 开始生成批发商户测试数据...\n');
  
  await connectDB();
  
  try {
    // 清除旧数据
    console.log('🗑️  清除旧数据...');
    await MerchantSale.deleteMany({ merchantId: 'merchant_001' });
    await MerchantRepair.deleteMany({ merchantId: 'merchant_001' });
    
    // 生成新数据
    const sales = await generateSales();
    const repairs = await generateRepairs();
    
    // 插入数据库
    console.log('\n💾 插入数据到数据库...');
    await MerchantSale.insertMany(sales);
    await MerchantRepair.insertMany(repairs);
    
    // 统计信息
    console.log('\n✅ 数据填充完成！\n');
    console.log('📊 统计信息:');
    console.log(`   - 销售记录: ${sales.length} 条`);
    console.log(`   - 维修记录: ${repairs.length} 条`);
    
    // 计算总额
    const totalSales = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalRepairs = repairs.reduce((sum, r) => sum + r.amount, 0);
    const totalTax = sales.reduce((sum, s) => sum + s.taxAmount, 0) + 
                     repairs.reduce((sum, r) => sum + r.taxAmount, 0);
    
    console.log(`   - 销售总额: €${totalSales.toFixed(2)}`);
    console.log(`   - 维修总额: €${totalRepairs.toFixed(2)}`);
    console.log(`   - 应缴税额: €${totalTax.toFixed(2)}`);
    
    // 按类别统计
    const salesByCategory = {};
    sales.forEach(s => {
      if (!salesByCategory[s.category]) {
        salesByCategory[s.category] = { count: 0, amount: 0 };
      }
      salesByCategory[s.category].count++;
      salesByCategory[s.category].amount += s.salePrice * s.quantity;
    });
    
    console.log('\n📈 销售分类统计:');
    Object.keys(salesByCategory).forEach(cat => {
      const catName = cat === 'NEW_DEVICE' ? '全新设备' : 
                      cat === 'USED_DEVICE' ? '二手设备' : '配件';
      console.log(`   - ${catName}: ${salesByCategory[cat].count} 笔, €${salesByCategory[cat].amount.toFixed(2)}`);
    });
    
    // 按支付方式统计
    const cashSales = sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const cardSales = sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const cashRepairs = repairs.filter(r => r.paymentMethod === 'CASH').reduce((sum, r) => sum + r.amount, 0);
    const cardRepairs = repairs.filter(r => r.paymentMethod === 'CARD').reduce((sum, r) => sum + r.amount, 0);
    
    console.log('\n💰 支付方式统计:');
    console.log(`   - 现金收入: €${(cashSales + cashRepairs).toFixed(2)}`);
    console.log(`   - 刷卡收入: €${(cardSales + cardRepairs).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
  }
}

// 运行
main();
