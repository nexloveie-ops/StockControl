const mongoose = require('mongoose');

const interCompanySalesInvoiceSchema = new mongoose.Schema({
  // 发票编号
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // 发票类型
  invoiceType: {
    type: String,
    default: 'inter_company_sale'
  },
  
  // 卖方商户信息
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  merchantName: {
    type: String,
    required: true
  },
  
  // 卖方公司信息
  seller: {
    name: String,
    address: String,
    vatNumber: String,
    phone: String,
    email: String
  },
  
  // 买方公司信息
  buyer: {
    name: String,
    address: String,
    vatNumber: String,
    phone: String,
    email: String
  },
  
  // 产品列表
  items: [{
    productName: {
      type: String,
      required: true
    },
    brand: String,
    model: String,
    category: String,
    serialNumber: String,
    color: String,
    condition: String,
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
    taxClassification: {
      type: String,
      default: 'VAT_23'
    }
  }],
  
  // 金额信息
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  vatRate: {
    type: Number,
    required: true,
    default: 0.23
  },
  vatAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 付款信息
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['transfer', 'cash', 'card', 'check'],
    default: 'transfer'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paidAt: Date,
  
  // 关联调货单
  relatedTransferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryTransfer'
  },
  relatedTransferNumber: String,
  
  // 发票日期
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  
  // 状态
  status: {
    type: String,
    enum: ['draft', 'completed', 'cancelled'],
    default: 'completed'
  },
  
  // 备注
  notes: String,
  
  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建索引
interCompanySalesInvoiceSchema.index({ invoiceNumber: 1 });
interCompanySalesInvoiceSchema.index({ merchantId: 1, invoiceDate: -1 });
interCompanySalesInvoiceSchema.index({ paymentStatus: 1 });
interCompanySalesInvoiceSchema.index({ relatedTransferId: 1 });
interCompanySalesInvoiceSchema.index({ status: 1, createdAt: -1 });

// 生成发票号
interCompanySalesInvoiceSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const timestamp = date.getTime();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SI-${timestamp}-${random}`;
};

// 虚拟字段：剩余应付金额
interCompanySalesInvoiceSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

module.exports = mongoose.model('InterCompanySalesInvoice', interCompanySalesInvoiceSchema);
