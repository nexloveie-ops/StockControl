const mongoose = require('mongoose');

const storeGroupSchema = new mongoose.Schema({
  // 店面组名称
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 店面组代码
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // 描述
  description: {
    type: String,
    trim: true
  },
  // 总部信息
  headquarters: {
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    phone: String,
    email: String
  },
  // 业务设置
  settings: {
    // 是否允许店面间库存共享
    allowInventorySharing: {
      type: Boolean,
      default: true
    },
    // 是否允许店面间调货
    allowStoreTransfers: {
      type: Boolean,
      default: true
    },
    // 统一定价策略
    uniformPricing: {
      type: Boolean,
      default: false
    },
    // 中央库存管理
    centralInventoryManagement: {
      type: Boolean,
      default: false
    }
  },
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
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
storeGroupSchema.index({ code: 1 });
storeGroupSchema.index({ name: 1 });
storeGroupSchema.index({ isActive: 1 });

module.exports = mongoose.model('StoreGroup', storeGroupSchema);