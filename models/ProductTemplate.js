const mongoose = require('mongoose');

// ProductTemplate 模型 - 产品模板
// 用于管理支持多维度变体的产品模板
const productTemplateSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // 模板名称
  name: {
    type: String,
    required: true
  },
  
  // 产品分类
  category: {
    type: String,
    required: true,
    index: true
  },
  
  // 是否跟踪库存
  trackInventory: {
    type: Boolean,
    default: true
  },
  
  // 变体维度（引用 UserSystemInfo）
  variantDimensions: [{
    systemInfoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSystemInfo'
    },
    name: String  // 维度名称（冗余存储，方便查询）
  }],
  
  // 变体列表
  variants: [{
    // 变体值组合（例如: { "iPhone Models": "iPhone 17", "Colors": "Black" }）
    values: {
      type: Map,
      of: String
    },
    // 成本价
    costPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    // 批发价
    wholesalePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    // 零售价
    retailPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    // 库存数量（仅当 trackInventory 为 true 时使用）
    quantity: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  
  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建复合索引
productTemplateSchema.index({ userId: 1, name: 1 });
productTemplateSchema.index({ userId: 1, category: 1 });
productTemplateSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('ProductTemplate', productTemplateSchema);
