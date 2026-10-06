/**
 * PennyTracker - Frontend Client Application
 * Handles Authentication, Transaction CRUD, Budget Rule Validations, and Chart.js Analytics
 */

// Determine API Base URL
const API_BASE_URL = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
  ? '/api'
  : 'https://pennytracker-1e6u.onrender.com/api';

// Predefined Categories
const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Business', 'Other'],
  expense: ['Food', 'Shopping', 'Transport', 'Bills', 'Education', 'Entertainment', 'Medical', 'Other'],
};

// Global State
let currentUser = null;
let authToken = localStorage.getItem('token') || null;
let userTransactions = [];
let userTotals = {
  totalIncome: 0,
  totalExpense: 0,
  totalBalance: 0,
};

// Chart instances
let incomeVsExpenseChartInstance = null;
let expenseByCategoryChartInstance = null;
let transactionHistoryChartInstance = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');

const tabLoginBtn = document.getElementById('tab-login-btn');
const tabRegisterBtn = document.getElementById('tab-register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const authAlert = document.getElementById('auth-alert');

const userWelcomeMsg = document.getElementById('user-welcome-msg');
const logoutBtn = document.getElementById('logout-btn');
const dashboardAlert = document.getElementById('dashboard-alert');

const totalIncomeDisplay = document.getElementById('total-income-display');
const totalExpenseDisplay = document.getElementById('total-expense-display');
const totalBalanceDisplay = document.getElementById('total-balance-display');

const addTransactionForm = document.getElementById('add-transaction-form');
const transactionAmountInput = document.getElementById('transaction-amount');
const transactionCategorySelect = document.getElementById('transaction-category');
const transactionDescriptionInput = document.getElementById('transaction-description');
const transactionDateInput = document.getElementById('transaction-date');

const filterTypeSelect = document.getElementById('filter-type');
const transactionsTableBody = document.getElementById('transactions-table-body');
const noTransactionsMsg = document.getElementById('no-transactions-msg');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editTransactionForm = document.getElementById('edit-transaction-form');
const editTransactionIdInput = document.getElementById('edit-transaction-id');
const editTransactionAmountInput = document.getElementById('edit-transaction-amount');
const editTransactionCategorySelect = document.getElementById('edit-transaction-category');
const editTransactionDescriptionInput = document.getElementById('edit-transaction-description');
const editTransactionDateInput = document.getElementById('edit-transaction-date');
const editModalAlert = document.getElementById('edit-modal-alert');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Format any number into Indian Rupee format: ₹25,000 or ₹17,000.50
 */
function formatRupee(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format ISO date string into DD MMM YYYY (e.g. 06 Oct 2026)
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format Date object to YYYY-MM-DD for HTML input[type="date"]
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Toast Notification Popup
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

/**
 * Show Alert inside a designated alert box
 */
function showAlert(alertEl, message, type = 'danger') {
  if (!alertEl) return;
  alertEl.className = `alert-box alert-${type}`;
  alertEl.innerHTML = `
    <i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
    <span>${message}</span>
  `;
  alertEl.classList.remove('hidden');
}

function hideAlert(alertEl) {
  if (!alertEl) return;
  alertEl.classList.add('hidden');
  alertEl.innerHTML = '';
}

// ==========================================================================
// Category Options Population
// ==========================================================================
function populateCategoryOptions(selectElement, type, selectedCategory = '') {
  selectElement.innerHTML = '';
  const categories = CATEGORIES[type] || [];
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (selectedCategory && cat.toLowerCase() === selectedCategory.toLowerCase()) {
      opt.selected = true;
    }
    selectElement.appendChild(opt);
  });
}

// Listener for Add Form Radio Type changes
document.querySelectorAll('input[name="transaction-type"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    populateCategoryOptions(transactionCategorySelect, e.target.value);
  });
});

// Listener for Edit Modal Radio Type changes
document.querySelectorAll('input[name="edit-transaction-type"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    populateCategoryOptions(editTransactionCategorySelect, e.target.value);
  });
});

// ==========================================================================
// Authentication Logic
// ==========================================================================

// Tab Switching
function showLoginTab() {
  tabLoginBtn.classList.add('active');
  tabRegisterBtn.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  hideAlert(authAlert);
}

function showRegisterTab() {
  tabRegisterBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  hideAlert(authAlert);
}

tabLoginBtn.addEventListener('click', showLoginTab);
tabRegisterBtn.addEventListener('click', showRegisterTab);
switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  showRegisterTab();
});
switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showLoginTab();
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(authAlert);

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (!name || !email || !password || !confirmPassword) {
    showAlert(authAlert, 'Please fill in all registration fields.', 'danger');
    return;
  }

  if (password !== confirmPassword) {
    showAlert(authAlert, 'Passwords do not match.', 'danger');
    return;
  }

  if (password.length < 6) {
    showAlert(authAlert, 'Password must be at least 6 characters long.', 'danger');
    return;
  }

  const submitBtn = document.getElementById('register-submit-btn');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(authAlert, data.message || 'Registration failed.', 'danger');
      return;
    }

    // Success: Switch to login and prefill email
    registerForm.reset();
    showLoginTab();
    document.getElementById('login-email').value = email;
    showAlert(authAlert, 'Account registered successfully! Please log in.', 'success');
    showToast('Registration successful! Please login.', 'success');
  } catch (err) {
    console.error('Registration fetch error:', err);
    showAlert(authAlert, 'Unable to connect to server. Please ensure the backend is running.', 'danger');
  } finally {
    submitBtn.disabled = false;
  }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(authAlert);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAlert(authAlert, 'Please enter both email and password.', 'danger');
    return;
  }

  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(authAlert, data.message || 'Invalid email or password.', 'danger');
      return;
    }

    // Store token and user
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    loginForm.reset();
    showToast(`Welcome back, ${currentUser.name}!`, 'success');
    initDashboard();
  } catch (err) {
    console.error('Login fetch error:', err);
    showAlert(authAlert, 'Unable to connect to backend server. Make sure MongoDB & Node.js are running.', 'danger');
  } finally {
    submitBtn.disabled = false;
  }
});

// Handle Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  authToken = null;
  currentUser = null;
  userTransactions = [];

  // Reset charts
  if (incomeVsExpenseChartInstance) incomeVsExpenseChartInstance.destroy();
  if (expenseByCategoryChartInstance) expenseByCategoryChartInstance.destroy();
  if (transactionHistoryChartInstance) transactionHistoryChartInstance.destroy();
  incomeVsExpenseChartInstance = null;
  expenseByCategoryChartInstance = null;
  transactionHistoryChartInstance = null;

  showToast('Logged out successfully.', 'success');
  switchToAuthView();
});

function switchToAuthView() {
  dashboardSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  showLoginTab();
}

function switchToDashboardView() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

// ==========================================================================
// Dashboard Logic
// ==========================================================================

async function initDashboard() {
  if (!authToken) {
    switchToAuthView();
    return;
  }

  // Restore user info if saved
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (_) {}
  }

  if (currentUser && currentUser.name) {
    userWelcomeMsg.textContent = `Welcome, ${currentUser.name}`;
  }

  // Initialize add form default category and date
  const selectedType = document.querySelector('input[name="transaction-type"]:checked').value;
  populateCategoryOptions(transactionCategorySelect, selectedType);
  transactionDateInput.value = getTodayDateString();

  switchToDashboardView();
  await fetchTransactions();
}

/**
 * Fetch all transactions for current user from backend
 */
async function fetchTransactions() {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (res.status === 401) {
      // Session expired or unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      switchToAuthView();
      showAlert(authAlert, 'Session expired. Please log in again.', 'warning');
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      showAlert(dashboardAlert, data.message || 'Failed to fetch transactions.', 'danger');
      return;
    }

    userTransactions = data.transactions || [];
    if (data.totals) {
      userTotals = data.totals;
    } else {
      recalculateLocalTotals();
    }

    updateDashboardUI();
  } catch (err) {
    console.error('Fetch transactions error:', err);
    showAlert(dashboardAlert, 'Network error loading transactions. Please check server.', 'danger');
  }
}

/**
 * Recalculate Totals Locally from userTransactions
 */
function recalculateLocalTotals() {
  let income = 0;
  let expense = 0;
  userTransactions.forEach((tx) => {
    if (tx.type === 'income') {
      income += Number(tx.amount);
    } else if (tx.type === 'expense') {
      expense += Number(tx.amount);
    }
  });
  userTotals = {
    totalIncome: income,
    totalExpense: expense,
    totalBalance: income - expense,
  };
}

/**
 * Update UI cards, history table, and Chart.js graphs
 */
function updateDashboardUI() {
  // Update Summary Cards
  totalIncomeDisplay.textContent = formatRupee(userTotals.totalIncome);
  totalExpenseDisplay.textContent = formatRupee(userTotals.totalExpense);
  totalBalanceDisplay.textContent = formatRupee(userTotals.totalBalance);

  // Render Table
  renderTransactionsTable();

  // Update Charts
  updateCharts();
}

/**
 * Render Transaction History Table
 */
function renderTransactionsTable() {
  const filter = filterTypeSelect.value;
  transactionsTableBody.innerHTML = '';

  const filteredTransactions = userTransactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  if (filteredTransactions.length === 0) {
    noTransactionsMsg.classList.remove('hidden');
    return;
  }

  noTransactionsMsg.classList.add('hidden');

  filteredTransactions.forEach((tx) => {
    const tr = document.createElement('tr');

    const isIncome = tx.type === 'income';
    const typeBadge = isIncome
      ? `<span class="badge badge-income"><i class="fa-solid fa-arrow-up"></i> Income</span>`
      : `<span class="badge badge-expense"><i class="fa-solid fa-arrow-down"></i> Expense</span>`;

    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const amountSign = isIncome ? '+' : '-';

    tr.innerHTML = `
      <td>${formatDate(tx.date)}</td>
      <td>${typeBadge}</td>
      <td><span class="category-tag">${escapeHTML(tx.category)}</span></td>
      <td>${escapeHTML(tx.description || '-')}</td>
      <td class="${amountClass}">${amountSign} ${formatRupee(tx.amount)}</td>
      <td class="text-right">
        <button class="action-btn action-btn-edit" data-id="${tx._id}" title="Edit Transaction">
          <i class="fa-regular fa-pen-to-square"></i> Edit
        </button>
        <button class="action-btn action-btn-delete" data-id="${tx._id}" title="Delete Transaction">
          <i class="fa-regular fa-trash-can"></i> Delete
        </button>
      </td>
    `;

    // Attach Edit and Delete listeners
    tr.querySelector('.action-btn-edit').addEventListener('click', () => openEditModal(tx._id));
    tr.querySelector('.action-btn-delete').addEventListener('click', () => deleteTransaction(tx._id));

    transactionsTableBody.appendChild(tr);
  });
}

filterTypeSelect.addEventListener('change', renderTransactionsTable);

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================================================
// Add Transaction Logic & Validation Rules
// ==========================================================================
addTransactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(dashboardAlert);

  const type = document.querySelector('input[name="transaction-type"]:checked').value;
  const amount = parseFloat(transactionAmountInput.value);
  const category = transactionCategorySelect.value;
  const description = transactionDescriptionInput.value.trim();
  const date = transactionDateInput.value;

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than 0.');
    return;
  }

  // RULE 1: Maximum amount allowed for a single transaction is ₹10,000
  if (amount > 10000) {
    alert('Transaction limit is ₹10,000.');
    return;
  }

  // RULE 2: Minimum balance that must be maintained is ₹1,000
  // If an expense causes the balance to go below ₹1,000
  if (type === 'expense') {
    const currentBalance = userTotals.totalBalance;
    if (currentBalance - amount < 1000) {
      alert('Minimum balance of ₹1,000 must be maintained.');
      return;
    }
  }

  const addBtn = document.getElementById('add-transaction-btn');
  addBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ type, amount, category, description, date }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to save transaction.');
      return;
    }

    // Success
    showToast('Transaction added successfully!', 'success');
    addTransactionForm.reset();

    // Re-check defaults
    document.getElementById('type-expense').checked = true;
    populateCategoryOptions(transactionCategorySelect, 'expense');
    transactionDateInput.value = getTodayDateString();

    // Update totals and list
    if (data.totals) {
      userTotals = data.totals;
    }
    await fetchTransactions();
  } catch (err) {
    console.error('Add transaction error:', err);
    alert('Network error adding transaction. Please try again.');
  } finally {
    addBtn.disabled = false;
  }
});

// ==========================================================================
// Edit Transaction Logic & Validation Rules
// ==========================================================================
function openEditModal(transactionId) {
  const tx = userTransactions.find((t) => t._id === transactionId);
  if (!tx) {
    alert('Transaction not found.');
    return;
  }

  hideAlert(editModalAlert);
  editTransactionIdInput.value = tx._id;

  if (tx.type === 'income') {
    document.getElementById('edit-type-income').checked = true;
  } else {
    document.getElementById('edit-type-expense').checked = true;
  }

  populateCategoryOptions(editTransactionCategorySelect, tx.type, tx.category);

  editTransactionAmountInput.value = tx.amount;
  editTransactionDescriptionInput.value = tx.description || '';

  // Format date to YYYY-MM-DD
  const txDate = new Date(tx.date);
  const formattedDate = txDate.toISOString().split('T')[0];
  editTransactionDateInput.value = formattedDate;

  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
  hideAlert(editModalAlert);
  editTransactionForm.reset();
}

closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

editTransactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(editModalAlert);

  const id = editTransactionIdInput.value;
  const originalTx = userTransactions.find((t) => t._id === id);
  if (!originalTx) {
    alert('Transaction not found.');
    return;
  }

  const newType = document.querySelector('input[name="edit-transaction-type"]:checked').value;
  const newAmount = parseFloat(editTransactionAmountInput.value);
  const newCategory = editTransactionCategorySelect.value;
  const newDescription = editTransactionDescriptionInput.value.trim();
  const newDate = editTransactionDateInput.value;

  if (isNaN(newAmount) || newAmount <= 0) {
    alert('Please enter a valid amount greater than 0.');
    return;
  }

  // RULE 1: Maximum amount allowed is ₹10,000
  if (newAmount > 10000) {
    alert('Transaction limit is ₹10,000.');
    return;
  }

  // RULE 2: Minimum balance of ₹1,000 must be maintained
  // Compute hypothetical balance if this edit is saved
  const otherIncome = userTransactions
    .filter((t) => t._id !== id && t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const otherExpense = userTransactions
    .filter((t) => t._id !== id && t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const hypotheticalIncome = otherIncome + (newType === 'income' ? newAmount : 0);
  const hypotheticalExpense = otherExpense + (newType === 'expense' ? newAmount : 0);
  const hypotheticalBalance = hypotheticalIncome - hypotheticalExpense;

  if (hypotheticalBalance < 1000) {
    alert('Minimum balance of ₹1,000 must be maintained.');
    return;
  }

  const saveBtn = document.getElementById('save-edit-btn');
  saveBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: newType,
        amount: newAmount,
        category: newCategory,
        description: newDescription,
        date: newDate,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to update transaction.');
      return;
    }

    closeEditModal();
    showToast('Transaction updated successfully!', 'success');

    if (data.totals) {
      userTotals = data.totals;
    }
    await fetchTransactions();
  } catch (err) {
    console.error('Update transaction error:', err);
    alert('Network error updating transaction.');
  } finally {
    saveBtn.disabled = false;
  }
});

// ==========================================================================
// Delete Transaction Logic
// ==========================================================================
async function deleteTransaction(id) {
  const confirmed = confirm('Are you sure you want to delete this transaction?');
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to delete transaction.');
      return;
    }

    showToast('Transaction deleted successfully.', 'success');
    if (data.totals) {
      userTotals = data.totals;
    }
    await fetchTransactions();
  } catch (err) {
    console.error('Delete transaction error:', err);
    alert('Network error deleting transaction.');
  }
}

// ==========================================================================
// Chart.js Visualizations
// ==========================================================================
function updateCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  renderIncomeVsExpenseChart();
  renderExpenseByCategoryChart();
  renderTransactionHistoryChart();
}

/**
 * Chart 1: Income vs Expense (Doughnut)
 */
function renderIncomeVsExpenseChart() {
  const ctx = document.getElementById('incomeVsExpenseChart');
  if (!ctx) return;

  if (incomeVsExpenseChartInstance) {
    incomeVsExpenseChartInstance.destroy();
  }

  const income = userTotals.totalIncome || 0;
  const expense = userTotals.totalExpense || 0;

  const dataValues = [income, expense];
  const hasData = income > 0 || expense > 0;

  incomeVsExpenseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Total Income', 'Total Expense'],
      datasets: [
        {
          data: hasData ? dataValues : [1, 1],
          backgroundColor: hasData
            ? ['#10b981', '#ef4444']
            : ['#e2e8f0', '#cbd5e1'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (!hasData) return 'No data yet';
              return ` ${context.label}: ${formatRupee(context.raw)}`;
            },
          },
        },
      },
      cutout: '70%',
    },
  });
}

/**
 * Chart 2: Expense by Category (Doughnut / Polar)
 */
function renderExpenseByCategoryChart() {
  const ctx = document.getElementById('expenseByCategoryChart');
  if (!ctx) return;

  if (expenseByCategoryChartInstance) {
    expenseByCategoryChartInstance.destroy();
  }

  const categoryTotals = {};
  userTransactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount);
    });

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);
  const hasData = categories.length > 0;

  const categoryColors = [
    '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#10b981', '#06b6d4', '#f97316', '#64748b',
  ];

  expenseByCategoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: hasData ? categories : ['No Expenses'],
      datasets: [
        {
          data: hasData ? amounts : [1],
          backgroundColor: hasData
            ? categoryColors.slice(0, categories.length)
            : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (!hasData) return 'No expenses recorded yet';
              return ` ${context.label}: ${formatRupee(context.raw)}`;
            },
          },
        },
      },
    },
  });
}

/**
 * Chart 3: Transaction History Trend (Chronological Line Chart)
 */
function renderTransactionHistoryChart() {
  const ctx = document.getElementById('transactionHistoryChart');
  if (!ctx) return;

  if (transactionHistoryChartInstance) {
    transactionHistoryChartInstance.destroy();
  }

  // Sort chronological (oldest to newest for trend)
  const chronologicalTx = [...userTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = chronologicalTx.map((tx) => formatDate(tx.date));
  let runningBalance = 0;
  const balancePoints = chronologicalTx.map((tx) => {
    if (tx.type === 'income') {
      runningBalance += Number(tx.amount);
    } else {
      runningBalance -= Number(tx.amount);
    }
    return runningBalance;
  });

  const hasData = chronologicalTx.length > 0;

  transactionHistoryChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hasData ? labels : ['No Activity'],
      datasets: [
        {
          label: 'Balance Trend (₹)',
          data: hasData ? balancePoints : [0],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#2563eb',
          pointRadius: hasData ? 4 : 0,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return '₹' + value.toLocaleString('en-IN');
            },
            font: { family: 'Plus Jakarta Sans', size: 11 },
          },
          grid: {
            color: '#f1f5f9',
          },
        },
        x: {
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 11 },
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` Running Balance: ${formatRupee(context.raw)}`;
            },
          },
        },
      },
    },
  });
}

// ==========================================================================
// Initialization on Page Load
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    initDashboard();
  } else {
    switchToAuthView();
  }
});
