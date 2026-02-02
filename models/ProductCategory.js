const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // 大分类：手机配件，电脑配件，车载配件，audio，数据线，power supply，全新设备，二手设备，维修等
  type: {
    type: String,
    enum: [
      '手机配件', '电脑配件', '车载配件', 'Audio', '数据线', 
      'Power Supply', '全新设备', '二手设备', '维修服务'
    ],
    required: true
  },
  // 默认税务分类
  defaultVatRate: {
    type: String,
    enum: ['VAT 23%', 'VAT 13.5%', 'VAT 0%'],
    default: 'VAT 23%'
  },
  // 默认成色
  defaultCondition: {
    type: String,
    enum: ['Brand New', 'Pre-Owned', 'Refurbished'],
    default: 'Brand New'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 创建索引
productCategorySchema.index({ type: 1, isActive: 1 });
productCategorySchema.index({ sortOrder: 1 });

module.exports = mongoose.model('ProductCategory', productCategorySchema);