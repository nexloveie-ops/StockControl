const mongoose = require('mongoose');

const salesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    name: String,
    email: String,
    phone: String,
    customerType: {
      type: String,
      enum: ['RETAIL', 'WHOLESALE']
    },
    merchantTier: {
      tierName: String,
      tierLevel: Number
    }
  },
  lineItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product3C'
    },
    productName: String,
    quantity: Number,
    unitPrice: Number,
    taxClassification: String,
    taxAmount: Number,
    lineTotal: Number,
    warehouseLocation: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'FINALIZED', 'CANCELLED'],
    default: 'DRAFT'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User3C',
    required: true
  },
  finalizedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('SalesInvoice', salesInvoiceSchema);
