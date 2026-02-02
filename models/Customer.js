const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // 客户名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 客户代码
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  // 公司注册号码
  registrationNumber: {
    type: String,
    trim: true
  },
  // 客户类型
  type: {
    type: String,
    enum: ['individual', 'business'],
    default: 'business'
  },
  // 联系信息
  contact: {
    person: String, // 联系人
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Ireland'
      }
    }
  },
  // 税号
  taxNumber: String,
  // 备注
  notes: String,
  // 是否活跃
  isActive: {
    type: Boolean,
    default: true
  },
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
customerSchema.index({ name: 1 });
customerSchema.index({ code: 1 });
customerSchema.index({ 'contact.email': 1 });
customerSchema.index({ isActive: 1 });

module.exports = mongoose.model('Customer', customerSchema);
