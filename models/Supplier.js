const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  contact: {
    person: String,
    phone: String,
    email: String,
    address: String
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'net15', 'net30', 'net60'],
    default: 'net30'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);