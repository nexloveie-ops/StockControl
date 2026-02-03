const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  // 分类类型名称（唯一标识）
  type: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 分类描述
  description: {
    type: String,
    trim: true
  },
  // 默认税率 - 从税率表中选择
  defaultVatRate: {
    type: String,
    default: 'VAT 23%'
  },
  // 默认成色 - 从成色表中选择
  defaultCondition: {
    type: String,
    default: 'BRAND_NEW'
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