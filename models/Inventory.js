const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRestockDate: {
    type: Date
  },
  location: {
    warehouse: String,
    shelf: String,
    bin: String
  }
}, {
  timestamps: true
});

// 计算可用库存
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);