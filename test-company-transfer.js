/**
 * 测试公司信息调货功能
 * 
 * 测试场景：
 * 1. 内部调拨（同一公司）
 * 2. 公司间销售（不同公司）
 */

require('dotenv').config();
const mongoose = require('mongoose');
const UserNew = require('./models/UserNew');
const MerchantInventory = require('./models/MerchantInventory');
const InventoryTransfer = require('./models/InventoryTransfer');
const InterCompanySalesInvoice = require('./models/InterCompanySalesInvoice');

async function testCompanyTransfer() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查用户公司信息
    console.log('=== 1. 检查用户公司信息 ===');
    const murrayRanelagh = await UserNew.findOne({ username: 'MurrayRanelagh' });
    const murrayDundrum = await UserNew.findOne({ username: 'MurrayDundrum' });
    
    console.log('MurrayRanelagh 公司信息:');
    console.log('  公司名称:', murrayRanelagh?.companyInfo?.companyName || '未设置');
    console.log('  VAT号:', murrayRanelagh?.companyInfo?.vatNumber || '未设置');
    
    console.log('\nMurrayDundrum 公司信息:');
    console.log('  公司名称:', murrayDundrum?.companyInfo?.companyName || '未设置');
    console.log('  VAT号:', murrayDundrum?.companyInfo?.vatNumber || '未设置');
    
    // 2. 判断交易类型
    console.log('\n=== 2. 判断交易类型 ===');
    const fromCompany = murrayRanelagh?.companyInfo?.companyName;
    const toCompany = murrayDundrum?.companyInfo?.companyName;
    
    let transferType;
    if (fromCompany && toCompany && fromCompany === toCompany) {
      transferType = 'INTERNAL_TRANSFER';
      console.log('✅ 同一公司 → 内部调拨');
    } else {
      transferType = 'INTER_COMPANY_SALE';
      console.log('💰 不同公司 → 公司间销售');
    }
    console.log('  调出方:', fromCompany || '未设置');
    console.log('  调入方:', toCompany || '未设置');
    console.log('  交易类型:', transferType);
    
    // 3. 检查库存
    console.log('\n=== 3. 检查 MurrayRanelagh 的库存 ===');
    const inventory = await MerchantInventory.find({
      merchantId: 'MurrayRanelagh',
      status: 'active',
      quantity: { $gt: 0 }
    }).limit(3);
    
    console.log(`找到 ${inventory.length} 条库存记录:`);
    inventory.forEach((item, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log('  产品名称:', item.productName);
      console.log('  数量:', item.quantity);
      console.log('  成本价:', item.costPrice);
      console.log('  批发价:', item.wholesalePrice);
      console.log('  零售价:', item.retailPrice);
      
      // 根据交易类型显示使用的价格
      if (transferType === 'INTERNAL_TRANSFER') {
        console.log('  → 内部调拨使用: €' + item.costPrice + ' (成本价)');
      } else {
        console.log('  → 公司间销售使用: €' + item.wholesalePrice + ' (批发价)');
      }
    });
    
    // 4. 检查最近的调货记录
    console.log('\n=== 4. 检查最近的调货记录 ===');
    const recentTransfers = await InventoryTransfer.find({
      $or: [
        { fromMerchant: 'MurrayRanelagh' },
        { toMerchant: 'MurrayRanelagh' },
        { fromMerchant: 'MurrayDundrum' },
        { toMerchant: 'MurrayDundrum' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    console.log(`找到 ${recentTransfers.length} 条调货记录:`);
    recentTransfers.forEach((transfer, index) => {
      console.log(`\n调货 ${index + 1}:`);
      console.log('  调货单号:', transfer.transferNumber);
      console.log('  交易类型:', transfer.transferType || '未设置');
      console.log('  调出方:', transfer.fromMerchantName);
      console.log('  调入方:', transfer.toMerchantName);
      console.log('  状态:', transfer.status);
      console.log('  总金额:', transfer.totalAmount);
      
      if (transfer.salesInvoiceNumber) {
        console.log('  关联发票:', transfer.salesInvoiceNumber);
      }
      
      if (transfer.financialInfo) {
        console.log('  财务信息:');
        console.log('    小计:', transfer.financialInfo.subtotal);
        console.log('    VAT:', transfer.financialInfo.vatAmount);
        console.log('    总计:', transfer.financialInfo.totalAmount);
      }
    });
    
    // 5. 检查公司间销售发票
    console.log('\n=== 5. 检查公司间销售发票 ===');
    const invoices = await InterCompanySalesInvoice.find({})
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`找到 ${invoices.length} 条销售发票:`);
    invoices.forEach((invoice, index) => {
      console.log(`\n发票 ${index + 1}:`);
      console.log('  发票号:', invoice.invoiceNumber);
      console.log('  卖方:', invoice.seller?.name || '未设置');
      console.log('  买方:', invoice.buyer?.name || '未设置');
      console.log('  小计:', invoice.subtotal);
      console.log('  VAT:', invoice.vatAmount);
      console.log('  总计:', invoice.totalAmount);
      console.log('  付款状态:', invoice.paymentStatus);
      console.log('  关联调货单:', invoice.relatedTransferNumber);
    });
    
    // 6. 模拟价格计算
    console.log('\n=== 6. 模拟价格计算 ===');
    if (inventory.length > 0) {
      const testItem = inventory[0];
      console.log('测试产品:', testItem.productName);
      
      // 内部调拨
      console.log('\n场景 1: 内部调拨（同一公司）');
      const internalPrice = testItem.costPrice;
      console.log('  使用价格:', internalPrice, '(成本价)');
      console.log('  数量: 1');
      console.log('  小计:', internalPrice);
      console.log('  VAT: 0 (内部调拨不计税)');
      console.log('  总计:', internalPrice);
      
      // 公司间销售
      console.log('\n场景 2: 公司间销售（不同公司）');
      const salePrice = testItem.wholesalePrice;
      const subtotal = salePrice;
      const vatRate = 0.23;
      const vatAmount = subtotal * vatRate;
      const totalAmount = subtotal + vatAmount;
      console.log('  使用价格:', salePrice, '(批发价)');
      console.log('  数量: 1');
      console.log('  小计:', subtotal.toFixed(2));
      console.log('  VAT (23%):', vatAmount.toFixed(2));
      console.log('  总计:', totalAmount.toFixed(2));
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

// 运行测试
testCompanyTransfer();
