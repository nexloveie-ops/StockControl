const mongoose = require('mongoose');
require('dotenv').config();

const ProductCondition = require('../models/ProductCondition');
const VatRate = require('../models/VatRate');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockcontrol';

// 初始设备成色数据
const initialConditions = [
  {
    code: 'BRAND_NEW',
    name: '全新',
    description: '全新未拆封产品',
    sortOrder: 1
  },
  {
    code: 'PRE_OWNED',
    name: '二手',
    description: '使用过的产品，功能正常',
    sortOrder: 2
  },
  {
    code: 'REFURBISHED',
    name: '翻新',
    description: '经过翻新处理的产品',
    sortOrder: 3
  }
];

// 初始税率数据
const initialVatRates = [
  {
    code: 'VAT 23%',
    name: 'VAT 23%',
    rate: 23,
    description: '标准增值税率',
    applicableScope: '适用于大部分商品',
    sortOrder: 1
  },
  {
    code: 'VAT 13.5%',
    name: 'VAT 13.5%',
    rate: 13.5,
    description: '减免增值税率',
    applicableScope: '适用于维修服务等',
    sortOrder: 2
  },
  {
    code: 'VAT 0%',
    name: 'VAT 0%',
    rate: 0,
    description: '免税',
    applicableScope: '适用于二手商品差价税制',
    sortOrder: 3
  }
];

async function initSystemSettings() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 初始化设备成色
    console.log('\n初始化设备成色...');
    for (const condition of initialConditions) {
      const existing = await ProductCondition.findOne({ code: condition.code });
      if (!existing) {
        await ProductCondition.create(condition);
        console.log(`✅ 创建成色: ${condition.name} (${condition.code})`);
      } else {
        console.log(`⏭️  成色已存在: ${condition.name} (${condition.code})`);
      }
    }

    // 初始化税率
    console.log('\n初始化税率...');
    for (const vatRate of initialVatRates) {
      const existing = await VatRate.findOne({ code: vatRate.code });
      if (!existing) {
        await VatRate.create(vatRate);
        console.log(`✅ 创建税率: ${vatRate.name} (${vatRate.rate}%)`);
      } else {
        console.log(`⏭️  税率已存在: ${vatRate.name} (${vatRate.rate}%)`);
      }
    }

    console.log('\n✅ 系统设置初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initSystemSettings();
