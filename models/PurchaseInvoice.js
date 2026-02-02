const mongoose = require('mongoose');

const purchaseInvoiceSchema = new mongoose.Schema({
  // 发票编号
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 供应商
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierNew',
    required: true
  },
  // 发票日期
  invoiceDate: {
    type: Date,
    required: true
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
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
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
    description: String
  }],
  // 小计（不含税）
  subtotal: {
    type: Number,
    required: true,
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
    enum: ['draft', 'confirmed', 'received', 'cancelled'],
    default: 'draft'
  },
  // 收货状态
  receivingStatus: {
    type: String,
    enum: ['pending', 'partial', 'complete'],
    default: 'pending'
  },
  // 备注
  notes: String,
  // 附件
  attachments: [{
    filename: String,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 创建索引
purchaseInvoiceSchema.index({ invoiceNumber: 1 });
purchaseInvoiceSchema.index({ supplier: 1, invoiceDate: -1 });
purchaseInvoiceSchema.index({ paymentStatus: 1 });
purchaseInvoiceSchema.index({ status: 1 });
purchaseInvoiceSchema.index({ dueDate: 1 });

// 虚拟字段：剩余应付金额
purchaseInvoiceSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

// 虚拟字段：是否逾期
purchaseInvoiceSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid';
});

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);