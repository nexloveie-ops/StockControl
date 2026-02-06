const mongoose = require('mongoose');

const merchantSaleSchema = new mongoose.Schema({
  // 商户信息
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 客户信息（可选）
  customerPhone: {
    type: String,
    default: null
  },
  
  // 支付信息
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'MIXED'],
    required: true
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  cardAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 销售项目
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MerchantInventory',
      default: null
    },
    repairOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairOrder',
      default: null
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    taxClassification: {
      type: String,
      default: 'VAT_23'
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    serialNumber: {
      type: String,
      default: null
    }
  }],
  
  // 总计
  subtotal: {
    type: Number,
    default: null,  // 原始小计（打折前）
    min: 0
  },
  discount: {
    type: Number,
    default: 0,  // 折扣金额
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 销售日期
  saleDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 状态
  status: {
    type: String,
    enum: ['completed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  
  // 备注
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 创建索引
merchantSaleSchema.index({ merchantId: 1, saleDate: -1 });
merchantSaleSchema.index({ customerPhone: 1 });
merchantSaleSchema.index({ status: 1 });

// 虚拟字段：利润
merchantSaleSchema.virtual('profit').get(function() {
  return this.items.reduce((sum, item) => {
    return sum + ((item.price - item.costPrice) * item.quantity);
  }, 0);
});

// 虚拟字段：成本总额
merchantSaleSchema.virtual('totalCost').get(function() {
  return this.items.reduce((sum, item) => {
    return sum + (item.costPrice * item.quantity);
  }, 0);
});

module.exports = mongoose.model('MerchantSale', merchantSaleSchema);
