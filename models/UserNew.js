const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // 个人信息
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    avatar: String
  },
  // 角色权限
  role: {
    type: String,
    enum: ['admin', 'warehouse_manager', 'retail_user'],
    required: true
  },
  // 权限详情
  permissions: {
    // 产品管理
    products: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // 库存管理
    inventory: {
      view: { type: Boolean, default: false },
      adjust: { type: Boolean, default: false },
      transfer: { type: Boolean, default: false }
    },
    // 供应商管理
    suppliers: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // 采购管理
    purchasing: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    // 销售管理
    sales: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      refund: { type: Boolean, default: false }
    },
    // 报表查看
    reports: {
      view: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    // 用户管理
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  // 零售用户特殊字段
  retailInfo: {
    // 店面类型
    storeType: {
      type: String,
      enum: ['single_store', 'chain_store'],
      default: 'single_store'
    },
    // 所属店面组（连锁店）
    storeGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreGroup'
    },
    // 具体店面
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store'
    },
    // 是否可以查看组内其他店面库存
    canViewGroupInventory: {
      type: Boolean,
      default: false
    },
    // 是否可以从组内其他店面调货
    canTransferFromGroup: {
      type: Boolean,
      default: false
    }
  },
  // 公司信息
  companyInfo: {
    // 公司名称
    companyName: {
      type: String,
      trim: true
    },
    // 公司注册号
    registrationNumber: {
      type: String,
      trim: true
    },
    // 税号/VAT号
    vatNumber: {
      type: String,
      trim: true
    },
    // 公司地址
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    // 联系信息
    contactPhone: String,
    contactEmail: String
  },
  // 账户状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 是否已验证邮箱
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // 最后登录时间
  lastLoginAt: Date,
  // 登录次数
  loginCount: {
    type: Number,
    default: 0
  },
  // 密码重置令牌
  passwordResetToken: String,
  passwordResetExpires: Date,
  // 邮箱验证令牌
  emailVerificationToken: String,
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  }
}, {
  timestamps: true
});

// 创建索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'retailInfo.storeGroup': 1 });
userSchema.index({ 'retailInfo.store': 1 });

// 密码加密中间件
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 虚拟字段：全名
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// 方法：设置默认权限
userSchema.methods.setDefaultPermissions = function() {
  switch (this.role) {
    case 'admin':
      // 管理员拥有所有权限
      Object.keys(this.permissions).forEach(module => {
        Object.keys(this.permissions[module]).forEach(permission => {
          this.permissions[module][permission] = true;
        });
      });
      break;
    
    case 'warehouse_manager':
      // 仓管员权限
      this.permissions.products = { view: true, create: true, edit: true, delete: false };
      this.permissions.inventory = { view: true, adjust: true, transfer: true };
      this.permissions.suppliers = { view: true, create: false, edit: false, delete: false };
      this.permissions.purchasing = { view: true, create: true, approve: false };
      this.permissions.sales = { view: true, create: false, refund: false };
      this.permissions.reports = { view: true, export: true };
      this.permissions.users = { view: false, create: false, edit: false, delete: false };
      break;
    
    case 'retail_user':
      // 零售用户权限
      this.permissions.products = { view: true, create: false, edit: false, delete: false };
      this.permissions.inventory = { view: true, adjust: false, transfer: false };
      this.permissions.suppliers = { view: false, create: false, edit: false, delete: false };
      this.permissions.purchasing = { view: false, create: false, approve: false };
      this.permissions.sales = { view: true, create: true, refund: true };
      this.permissions.reports = { view: true, export: false };
      this.permissions.users = { view: false, create: false, edit: false, delete: false };
      break;
  }
};

module.exports = mongoose.model('UserNew', userSchema);