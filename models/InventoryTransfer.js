const mongoose = require('mongoose');

const inventoryTransferSchema = new mongoose.Schema({
  // 调货单号
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // 交易类型
  transferType: {
    type: String,
    enum: ['INTERNAL_TRANSFER', 'INTER_COMPANY_SALE'],
    required: true,
    default: 'INTERNAL_TRANSFER'
  },
  
  // 调出方信息
  fromMerchant: {
    type: String,
    required: true
  },
  fromMerchantName: {
    type: String,
    required: true
  },
  fromStore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  // 调出方公司信息
  fromCompany: {
    companyName: String,
    registrationNumber: String,
    vatNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    contactPhone: String,
    contactEmail: String
  },
  
  // 调入方信息
  toMerchant: {
    type: String,
    required: true
  },
  toMerchantName: {
    type: String,
    required: true
  },
  toStore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  // 调入方公司信息
  toCompany: {
    companyName: String,
    registrationNumber: String,
    vatNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    contactPhone: String,
    contactEmail: String
  },
  
  // 所属店面组
  storeGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoreGroup',
    required: true
  },
  
  // 调货产品列表
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MerchantInventory',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    brand: String,
    model: String,
    category: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    transferPrice: {
      type: Number,
      required: true,
      min: 0
    },
    barcode: String,
    serialNumber: String,
    color: String,
    condition: String,
    taxClassification: {
      type: String,
      default: 'VAT_23'
    },
    retailPrice: Number  // 保存原产品的零售价
  }],
  
  // 金额信息
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 财务信息（仅公司间销售）
  financialInfo: {
    subtotal: Number,        // 小计
    vatRate: Number,         // VAT税率
    vatAmount: Number,       // VAT金额
    totalAmount: Number,     // 总金额
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending'
    },
    paymentMethod: String,   // 付款方式
    paidAmount: Number,      // 已付金额
    paidAt: Date            // 付款时间
  },
  
  // 关联销售发票（仅公司间销售）
  salesInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesInvoice'
  },
  salesInvoiceNumber: String,
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'shipped', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // 操作人员
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  },
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  },
  
  // 备注
  notes: {
    type: String,
    default: ''
  },
  approvalNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  
  // 时间戳
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  rejectedAt: Date,
  shippedAt: Date,
  completedAt: Date,
  
  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建索引
inventoryTransferSchema.index({ transferNumber: 1 });
inventoryTransferSchema.index({ fromMerchant: 1, status: 1 });
inventoryTransferSchema.index({ toMerchant: 1, status: 1 });
inventoryTransferSchema.index({ storeGroup: 1, status: 1 });
inventoryTransferSchema.index({ status: 1, createdAt: -1 });

// 生成调货单号
inventoryTransferSchema.statics.generateTransferNumber = async function() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // 查找今天的最后一个单号
  const lastTransfer = await this.findOne({
    transferNumber: new RegExp(`^TRF${dateStr}`)
  }).sort({ transferNumber: -1 });
  
  let sequence = 1;
  if (lastTransfer) {
    const lastSequence = parseInt(lastTransfer.transferNumber.slice(-3));
    sequence = lastSequence + 1;
  }
  
  return `TRF${dateStr}${sequence.toString().padStart(3, '0')}`;
};

module.exports = mongoose.model('InventoryTransfer', inventoryTransferSchema);
