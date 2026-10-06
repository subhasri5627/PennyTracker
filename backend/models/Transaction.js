const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify transaction type (income or expense)'],
      enum: {
        values: ['income', 'expense'],
        message: '{VALUE} is not a valid transaction type',
      },
      lowercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please enter transaction amount'],
      min: [0.01, 'Amount must be greater than 0'],
      max: [10000, 'Transaction limit is ₹10,000.'],
    },
    category: {
      type: String,
      required: [true, 'Please select or enter a category'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Please select a date'],
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'transactions',
  }
);

// Update updatedAt on save
transactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
