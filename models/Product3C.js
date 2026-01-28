const mongoose = require('mongoose');

// 产品基础Schema
const product3CSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 产品类型（用于分组）
  productType: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['ACCESSORY', 'NEW_DEVICE', 'USED_DEVICE'],
    required: true
  },
  // 配件类产品字段
  barcode: {
    type: String,
    sparse: true,
    unique: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  // 设备类产品字段
  serialNumber: {
    type: String,
    sparse: true,
    unique: true
  },
  deviceType: {
    type: String,
    enum: ['NEW', 'USED']
  },
  conditionGrade: {
    type: String,
    enum: ['A_PLUS', 'A', 'B', 'C']
  },
  // 价格信息
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseTax: {
    type: Number,
    required: true,
    min: 0
  },
  taxClassification: {
    type: String,
    enum: ['VAT_23', 'MARGIN_VAT_0', 'SERVICE_VAT_13_5'],
    required: true
  },
  suggestedRetailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  wholesalePrice: {
    type: Number,
    required: true,
    min: 0
  },
  tierPricing: [{
    tierName: String,
    tierLevel: Number,
    price: Number
  }],
  // 库存信息
  procurementDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'DAMAGED', 'SCRAPPED', 'SOLD'],
    default: 'AVAILABLE'
  },
  warehouseLocation: {
    type: String,
    default: 'A-01'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier3C',
    required: true
  },
  procurementInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcurementInvoice'
  },
  salesStatus: {
    type: String,
    enum: ['UNSOLD', 'SOLD'],
    default: 'UNSOLD'
  }
}, {
  timestamps: true
});

// 索引
product3CSchema.index({ category: 1, status: 1 });
product3CSchema.index({ barcode: 1 });
product3CSchema.index({ serialNumber: 1 });
product3CSchema.index({ supplier: 1 });

module.exports = mongoose.model('Product3C', product3CSchema);
