const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  // 商户ID（用于数据隔离）
  merchantId: {
    type: String,
    default: null,
    index: true
  },
  // VAT号码
  vatNumber: {
    type: String,
    trim: true,
    default: ''
  },
  contact: {
    person: String,
    phone: String,
    email: String,
    address: String
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'net15', 'net30', 'net60'],
    default: 'net30'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// 复合索引：确保同一商户下code唯一
supplierSchema.index({ code: 1, merchantId: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);