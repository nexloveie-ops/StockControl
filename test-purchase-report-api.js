const mongoose = require('mongoose');
require('dotenv').config();

async function testPurchaseReportAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');
    
    const InventoryTransfer = require('./models/InventoryTransfer');
    
    const merchantId = 'MurrayRanelagh';
    
    console.log(`📦 测试采购报表API - merchantId: ${merchantId}\n`);
    
    // 查询调货记录（作为接收方）
    const transferQuery = {
      toMerchant: merchantId,
      status: 'completed'
    };
    
    const transfers = await InventoryTransfer.find(transferQuery).sort({ transferDate: -1 }).lean();
    
    console.log(`调货记录数量: ${transfers.length}\n`);
    
    if (transfers.length > 0) {
      const transfer = transfers[0];
      console.log(`调货单号: ${transfer.transferNumber}`);
      console.log(`调货日期: ${transfer.transferDate}`);
      console.log(`状态: ${transfer.status}`);
      console.log(`从: ${transfer.fromMerchant}`);
      console.log(`到: ${transfer.toMerchant}`);
      console.log(`\n商品明细:`);
      
      let totalAmount = 0;
      let taxAmount = 0;
      
      transfer.items.forEach((item, index) => {
        const itemTotal = (item.transferPrice || item.costPrice || 0) * item.quantity;
        totalAmount += itemTotal;
        
        let itemTax = 0;
        // 只有VAT_23和VAT_13_5才计算税额，Margin VAT不计算
        if (item.taxClassification === 'VAT_23' || item.taxClassification === 'VAT 23%') {
          itemTax = itemTotal - (itemTotal / 1.23);
          taxAmount += itemTax;
        } else if (item.taxClassification === 'VAT_13_5' || item.taxClassification === 'VAT 13.5%') {
          itemTax = itemTotal - (itemTotal / 1.135);
          taxAmount += itemTax;
        }
        
        console.log(`\n${index + 1}. ${item.productName}`);
        console.log(`   数量: ${item.quantity}`);
        console.log(`   单价: €${item.transferPrice}`);
        console.log(`   小计: €${itemTotal.toFixed(2)}`);
        console.log(`   税分类: ${item.taxClassification}`);
        console.log(`   税额: €${itemTax.toFixed(2)}`);
      });
      
      console.log(`\n总金额: €${totalAmount.toFixed(2)}`);
      console.log(`总税额: €${taxAmount.toFixed(2)}`);
      
      console.log(`\n\n✅ API应该返回的数据:`);
      console.log(JSON.stringify({
        orderNumber: transfer.transferNumber,
        date: transfer.transferDate,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        supplier: transfer.fromMerchant || '内部调货',
        type: 'transfer',
        itemCount: transfer.items.length
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPurchaseReportAPI();
