const mongoose = require('mongoose');

const vatRateSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    trim: true
  },
  applicableScope: {
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
vatRateSchema.index({ code: 1, isActive: 1 });
vatRateSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('VatRate', vatRateSchema);
