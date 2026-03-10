const mongoose = require('mongoose');

// UserSystemInfo 模型 - 用户专属系统信息
// 用于存储用户自定义的变体维度、分类、产品型号等信息
const userSystemInfoSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // 信息类型
  type: {
    type: String,
    required: true,
    enum: ['PHONE_MODEL', 'TABLET_MODEL', 'COLOR', 'STORAGE', 'CATEGORY', 'VARIANT_DIMENSION', 'PRODUCT_MODEL', 'OTHER'],
    index: true
  },
  
  // 名称（例如: "iPhone Models", "Colors", "Storage Capacity"）
  name: {
    type: String,
    required: true
  },
  
  // 值列表（例如: ["iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max"]）
  values: {
    type: [String],
    required: true,
    default: []
  },
  
  // 描述
  description: {
    type: String,
    default: ''
  },
  
  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建复合索引
userSystemInfoSchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });
userSystemInfoSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('UserSystemInfo', userSystemInfoSchema);
