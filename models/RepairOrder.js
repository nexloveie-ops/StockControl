const mongoose = require('mongoose');

const repairOrderSchema = new mongoose.Schema({
  // 商户信息
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 客户信息
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: ''
  },
  
  // 设备信息
  deviceName: {
    type: String,
    required: true
  },
  deviceIMEI: {
    type: String,
    default: ''
  },
  deviceSN: {
    type: String,
    default: ''
  },
  
  // 维修信息
  problemDescription: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  
  // 维修地点
  repairLocation: {
    type: String,
    default: '' // 空表示自己维修
  },
  
  // 预计完成时间
  estimatedCompletionDate: {
    type: Date,
    default: null
  },
  
  // 维修费用
  repairCost: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 状态
  status: {
    type: String,
    enum: [
      'pending',      // 待维修（自己维修）
      'sent_out',     // 已送出（外送维修）
      'retrieved',    // 已取回（外送维修完成）
      'completed',    // 已完成（自己维修完成）
      'ready_for_sale', // 等待销售
      'sold',         // 已销售
      'cancelled'     // 已取消
    ],
    default: 'pending'
  },
  
  // 时间记录
  receivedDate: {
    type: Date,
    default: Date.now
  },
  sentOutDate: {
    type: Date,
    default: null
  },
  retrievedDate: {
    type: Date,
    default: null
  },
  completedDate: {
    type: Date,
    default: null
  },
  soldDate: {
    type: Date,
    default: null
  },
  
  // 销售信息（如果已销售）
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MerchantSale',
    default: null
  },
  salePrice: {
    type: Number,
    default: 0
  },
  
  // 税务分类（维修服务使用 Service VAT 13.5%）
  taxClassification: {
    type: String,
    default: 'SERVICE_VAT_13_5'
  }
}, {
  timestamps: true
});

// 创建索引
repairOrderSchema.index({ merchantId: 1, status: 1 });
repairOrderSchema.index({ customerPhone: 1 });
repairOrderSchema.index({ deviceIMEI: 1 });
repairOrderSchema.index({ deviceSN: 1 });
repairOrderSchema.index({ receivedDate: -1 });

// 虚拟字段：是否外送维修
repairOrderSchema.virtual('isOutsourced').get(function() {
  return this.repairLocation && this.repairLocation.trim() !== '';
});

// 虚拟字段：维修周期（天数）
repairOrderSchema.virtual('repairDuration').get(function() {
  if (!this.completedDate) return null;
  const start = this.receivedDate;
  const end = this.completedDate;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('RepairOrder', repairOrderSchema);
