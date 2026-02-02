const mongoose = require('mongoose');

const companyInfoSchema = new mongoose.Schema({
  // 公司名称
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  // 地址
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Ireland'
    }
  },
  // 联系信息
  contact: {
    phone: String,
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: String
  },
  // 税号
  taxNumber: {
    type: String,
    trim: true
  },
  // 银行信息
  bankDetails: {
    iban: String,
    bic: String,
    bankName: String,
    accountName: String
  },
  // Logo URL（可选）
  logoUrl: String,
  // 是否为默认公司信息
  isDefault: {
    type: Boolean,
    default: true
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  },
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNew'
  }
}, {
  timestamps: true
});

// 确保只有一个默认公司信息
companyInfoSchema.pre('save', async function() {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

module.exports = mongoose.model('CompanyInfo', companyInfoSchema);
