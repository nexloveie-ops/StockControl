const mongoose = require('mongoose');

const productConditionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 创建索引
productConditionSchema.index({ code: 1, isActive: 1 });
productConditionSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('ProductCondition', productConditionSchema);
