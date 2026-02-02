const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // 店面名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 店面代码
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // 所属店面组（如果是连锁店）
  storeGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoreGroup'
  },
  // 店面类型
  type: {
    type: String,
    enum: ['single', 'chain_member', 'flagship', 'outlet'],
    default: 'single'
  },
  // 地址信息
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: String,
    postalCode: String,
    country: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // 联系信息
  contact: {
    phone: String,
    email: String,
    manager: String
  },
  // 营业信息
  business: {
    // 营业时间
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
    },
    // 店面面积（平方米）
    floorArea: Number,
    // 员工数量
    staffCount: {
      type: Number,
      default: 1
    }
  },
  // 库存设置
  inventory: {
    // 独立库存管理
    independentInventory: {
      type: Boolean,
      default: true
    },
    // 最大库存容量
    maxCapacity: Number,
    // 安全库存天数
    safetyStockDays: {
      type: Number,
      default: 7
    }
  },
  // 财务信息
  financial: {
    // 月租金
    monthlyRent: Number,
    // 月销售目标
    monthlySalesTarget: Number,
    // 税务设置
    taxSettings: {
      defaultVatRate: {
        type: String,
        enum: ['VAT 23%', 'VAT 13.5%', 'VAT 0%'],
        default: 'VAT 23%'
      },
      taxNumber: String
    }
  },
  // 统计信息
  statistics: {
    // 总销售额
    totalSales: {
      type: Number,
      default: 0
    },
    // 总订单数
    totalOrders: {
      type: Number,
      default: 0
    },
    // 平均订单价值
    averageOrderValue: {
      type: Number,
      default: 0
    },
    // 最后销售日期
    lastSaleDate: Date
  },
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 开业日期
  openingDate: Date,
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew',
    required: true
  }
}, {
  timestamps: true
});

// 创建索引
storeSchema.index({ code: 1 });
storeSchema.index({ storeGroup: 1, isActive: 1 });
storeSchema.index({ type: 1 });
storeSchema.index({ 'address.city': 1, 'address.country': 1 });

// 虚拟字段：完整地址
storeSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country];
  return parts.filter(part => part && part.trim()).join(', ');
});

// 虚拟字段：是否为连锁店成员
storeSchema.virtual('isChainMember').get(function() {
  return !!this.storeGroup;
});

module.exports = mongoose.model('Store', storeSchema);