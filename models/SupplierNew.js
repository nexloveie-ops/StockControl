const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  // 供应商名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 供应商代码
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // 联系信息
  contact: {
    // 联系人
    person: {
      type: String,
      trim: true
    },
    // 电话
    phone: {
      type: String,
      trim: true
    },
    // 邮箱
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    // 地址
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    // 网站
    website: String
  },
  // 财务信息
  financial: {
    // 付款条件
    paymentTerms: {
      type: String,
      enum: ['cash', 'net7', 'net15', 'net30', 'net60', 'net90'],
      default: 'net30'
    },
    // 信用额度
    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    // 税号
    taxNumber: String,
    // 银行信息
    bankDetails: {
      bankName: String,
      accountNumber: String,
      iban: String,
      swift: String
    }
  },
  // 业务信息
  business: {
    // 主要产品类别
    primaryCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory'
    }],
    // 供应商类型
    type: {
      type: String,
      enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider'],
      default: 'distributor'
    },
    // 服务等级
    serviceLevel: {
      type: String,
      enum: ['premium', 'standard', 'basic'],
      default: 'standard'
    }
  },
  // 评级和统计
  rating: {
    // 质量评分 (1-5)
    quality: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    // 交付评分 (1-5)
    delivery: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    // 价格评分 (1-5)
    pricing: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    // 服务评分 (1-5)
    service: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  },
  // 统计信息
  statistics: {
    // 总订单数
    totalOrders: {
      type: Number,
      default: 0
    },
    // 总采购金额
    totalPurchaseAmount: {
      type: Number,
      default: 0
    },
    // 最后订单日期
    lastOrderDate: Date,
    // 平均交付时间（天）
    averageDeliveryDays: {
      type: Number,
      default: 0
    }
  },
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 是否为首选供应商
  isPreferred: {
    type: Boolean,
    default: false
  },
  // 备注
  notes: String,
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
supplierSchema.index({ code: 1 });
supplierSchema.index({ name: 1 });
supplierSchema.index({ isActive: 1, isPreferred: -1 });
supplierSchema.index({ 'business.primaryCategories': 1 });
supplierSchema.index({ 'contact.email': 1 });

// 虚拟字段：综合评分
supplierSchema.virtual('overallRating').get(function() {
  const { quality, delivery, pricing, service } = this.rating;
  return ((quality + delivery + pricing + service) / 4).toFixed(1);
});

// 虚拟字段：完整地址
supplierSchema.virtual('fullAddress').get(function() {
  const addr = this.contact.address;
  if (!addr) return '';
  
  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country];
  return parts.filter(part => part && part.trim()).join(', ');
});

module.exports = mongoose.model('SupplierNew', supplierSchema);