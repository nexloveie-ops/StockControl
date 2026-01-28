const mongoose = require('mongoose');

const supplier3CSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  taxId: {
    type: String,
    required: true,
    unique: true
  },
  paymentTerms: {
    type: String,
    default: 'NET_30'
  },
  active: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier3C', supplier3CSchema);
