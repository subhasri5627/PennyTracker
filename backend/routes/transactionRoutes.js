const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// All transaction routes are protected
router.use(protect);

// Helper to compute user's balance
const computeUserTotals = async (userId) => {
  const transactions = await Transaction.find({ user: userId });
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
  };
};

// @route   GET /api/transactions
// @desc    Get all transactions and totals for the logged in user (newest first)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ date: -1, createdAt: -1 });

    const totals = await computeUserTotals(req.user._id);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      totals,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions.',
    });
  }
});

// @route   POST /api/transactions
// @desc    Add a new transaction
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    // Validate type
    if (!type || !['income', 'expense'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type. Must be income or expense.',
      });
    }

    const normalizedType = type.toLowerCase();
    const parsedAmount = Number(amount);

    // Validate amount
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid positive amount.',
      });
    }

    // Rule 1: Max transaction limit is ₹10,000
    if (parsedAmount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Transaction limit is ₹10,000.',
      });
    }

    if (!category || category.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category.',
      });
    }

    // Rule 2: Minimum balance of ₹1,000 must be maintained
    // If an expense causes the balance to go below ₹1,000
    if (normalizedType === 'expense') {
      const { totalBalance } = await computeUserTotals(req.user._id);
      if (totalBalance - parsedAmount < 1000) {
        return res.status(400).json({
          success: false,
          message: 'Minimum balance of ₹1,000 must be maintained.',
        });
      }
    }

    const transactionDate = date ? new Date(date) : new Date();

    const newTransaction = await Transaction.create({
      user: req.user._id,
      type: normalizedType,
      amount: parsedAmount,
      category: category.trim(),
      description: description ? description.trim() : '',
      date: transactionDate,
    });

    const updatedTotals = await computeUserTotals(req.user._id);

    return res.status(201).json({
      success: true,
      message: 'Transaction added successfully.',
      transaction: newTransaction,
      totals: updatedTotals,
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add transaction. Please try again.',
    });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update an existing transaction
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID.',
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    // Ensure transaction belongs to the logged-in user
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this transaction.',
      });
    }

    const { type, amount, category, description, date } = req.body;

    const newType = type ? type.toLowerCase() : transaction.type;
    if (!['income', 'expense'].includes(newType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type. Must be income or expense.',
      });
    }

    const newAmount = amount !== undefined ? Number(amount) : transaction.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid positive amount.',
      });
    }

    // Rule 1: Max transaction limit ₹10,000
    if (newAmount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Transaction limit is ₹10,000.',
      });
    }

    const newCategory = category !== undefined ? category.trim() : transaction.category;
    if (!newCategory) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category.',
      });
    }

    // Rule 2: Minimum balance of ₹1,000 must be maintained
    // Calculate new total balance if this change is applied
    const otherTransactions = await Transaction.find({
      user: req.user._id,
      _id: { $ne: transaction._id },
    });

    let otherIncome = 0;
    let otherExpense = 0;
    otherTransactions.forEach((tx) => {
      if (tx.type === 'income') otherIncome += tx.amount;
      else if (tx.type === 'expense') otherExpense += tx.amount;
    });

    const hypotheticalIncome = otherIncome + (newType === 'income' ? newAmount : 0);
    const hypotheticalExpense = otherExpense + (newType === 'expense' ? newAmount : 0);
    const hypotheticalBalance = hypotheticalIncome - hypotheticalExpense;

    if (hypotheticalBalance < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum balance of ₹1,000 must be maintained.',
      });
    }

    // Apply updates
    transaction.type = newType;
    transaction.amount = newAmount;
    transaction.category = newCategory;
    if (description !== undefined) transaction.description = description.trim();
    if (date) transaction.date = new Date(date);
    transaction.updatedAt = Date.now();

    const updatedTransaction = await transaction.save();
    const updatedTotals = await computeUserTotals(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction: updatedTransaction,
      totals: updatedTotals,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update transaction.',
    });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID.',
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    // Ensure transaction belongs to the logged-in user
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this transaction.',
      });
    }

    await Transaction.findByIdAndDelete(id);
    const updatedTotals = await computeUserTotals(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
      totals: updatedTotals,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete transaction.',
    });
  }
});

module.exports = router;
