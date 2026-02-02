const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const user3CSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['RETAIL_CUSTOMER', 'WHOLESALE_MERCHANT', 'WAREHOUSE_STAFF', 'ADMINISTRATOR'],
    required: true
  },
  // 批发商户等级
  merchantTier: {
    tierName: String,
    tierLevel: Number
  },
  // 仓管员折扣范围
  discountRange: {
    minPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    maxPercent: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// 密码加密
user3CSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// 密码验证
user3CSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User3C', user3CSchema);
