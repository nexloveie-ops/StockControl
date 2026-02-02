const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier3C',
    required: true
  },
  lineItems: [{
    productName: String,
    category: String,
    barcode: String,
    serialNumbers: [String],
    deviceType: String,
    conditionGrade: String,
    taxClassification: String,
    quantity: Number,
    expectedUnitPrice: Number,
    lineTotal: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CONFIRMED', 'CANCELLED'],
    default: 'DRAFT'
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User3C'
    },
    notes: String
  }],
  orderDate: Date,
  trackingNumber: String,
  receivedDate: Date,
  confirmedDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User3C',
    required: true
  },
  revisionHistory: [{
    revisionNumber: Number,
    timestamp: Date,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User3C'
    },
    changes: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
