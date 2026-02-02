const mongoose = require('mongoose');

const salesInvoiceSchema = new mongoose.Schema({
  // 发票编号
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 客户
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  // 发票日期
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // 到期日期
  dueDate: {
    type: Date
  },
  // 发票项目
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductNew',
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    // VAT税率
    vatRate: {
      type: String,
      enum: ['VAT 23%', 'VAT 13.5%', 'VAT 0%'],
      default: 'VAT 23%'
    },
    // 单项税额
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    // 序列号（如果适用）
    serialNumbers: [String],
    barcode: String
  }],
  // 小计（不含税）
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  // 折扣
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // 税额
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // 总金额（含税）
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // 货币
  currency: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'GBP', 'CNY']
  },
  // 付款状态
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  // 已付金额
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // 付款记录
  payments: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit_card', 'check']
    },
    reference: String,
    notes: String
  }],
  // 发票状态
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'delivered', 'cancelled'],
    default: 'draft'
  },
  // 备注
  notes: String,
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew',
    required: true
  },
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  }
}, {
  timestamps: true
});

// 创建索引
salesInvoiceSchema.index({ invoiceNumber: 1 });
salesInvoiceSchema.index({ customer: 1, invoiceDate: -1 });
salesInvoiceSchema.index({ paymentStatus: 1 });
salesInvoiceSchema.index({ status: 1 });
salesInvoiceSchema.index({ invoiceDate: -1 });

// 虚拟字段：剩余应付金额
salesInvoiceSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

// 虚拟字段：是否逾期
salesInvoiceSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid';
});

module.exports = mongoose.model('SalesInvoice', salesInvoiceSchema);
