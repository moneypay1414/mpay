import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import { generateTransactionId } from '../utils/helpers.js';
import { sendSMS } from '../utils/sms.js';
import Commission from '../models/Commission.js';
import { getIO } from '../utils/socket.js';
import TieredCommission from '../models/TieredCommission.js';
import StateSetting from '../models/StateSetting.js';
import Currency from '../models/Currency.js';
import ExchangeRate from '../models/ExchangeRate.js';

export const topupUser = async (req, res) => {
  try {
    const { userId, description } = req.body;
    const amount = parseFloat(req.body.amount);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate user balance exists
    if (user.balance === undefined || user.balance === null) {
      return res.status(500).json({ message: 'User balance is invalid' });
    }

    user.balance += amount;
    await user.save();

    const transactionId = generateTransactionId();
    const admin = await User.findById(req.userId);
    const transaction = new Transaction({
      transactionId,
      sender: req.userId,
      receiver: userId,
      amount,
      type: 'topup',
      status: 'completed',
      description,
      senderBalance: 0,
      receiverBalance: user.balance,
      senderLocation: admin?.currentLocation || null,
      receiverLocation: user.currentLocation || null
    });

    await transaction.save();

    const notification = new Notification({
      recipient: userId,
      title: 'Account Topped Up',
      message: `Your account has been topped up with SSP ${amount}`,
      type: 'system',
      relatedTransaction: transaction._id
    });

    await notification.save();

    try {
      await sendSMS(user.phone, `MoneyPay: Your account has been credited with SSP ${amount}`);
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({
      message: 'Topup successful',
      transaction: { _id: transaction._id, transactionId, amount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// State settings CRUD
export const createStateSetting = async (req, res) => {
  try {
    const { name, commissionPercent } = req.body;
    if (!name) return res.status(400).json({ message: 'State name is required' });
    const existing = await StateSetting.findOne({ name });
    if (existing) return res.status(400).json({ message: 'State already exists' });
    const s = new StateSetting({ name, commissionPercent: Number(commissionPercent) || 0 });
    await s.save();
    res.json({ message: 'State created', state: s });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Currency CRUD for admin
export const createCurrency = async (req, res) => {
  try {
    const { name, code, symbol, countries, exchangeRate, tier, buyingPrice, sellingPrice, priceType } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code are required' });
    const existing = await Currency.findOne({ code });
    if (existing) return res.status(400).json({ message: 'Currency with this code already exists' });
    const cData = {
      name,
      code,
      symbol,
      countries: countries || [],
      tier,
      buyingPrice: buyingPrice && buyingPrice !== '' ? Number(buyingPrice) : null,
      sellingPrice: sellingPrice && sellingPrice !== '' ? Number(sellingPrice) : null,
      priceType: priceType || 'fixed'
    };
    // Only set exchangeRate if a value was provided (avoid defaulting to 1)
    if (exchangeRate !== undefined && exchangeRate !== null && exchangeRate !== '') {
      cData.exchangeRate = Number(exchangeRate);
    }
    const c = new Currency(cData);
    await c.save();
    res.json({ message: 'Currency created', currency: c });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCurrencies = async (req, res) => {
  try {
    const list = await Currency.find().sort({ name: 1 });
    res.json({ currencies: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const cur = await Currency.findById(id);
    if (!cur) return res.status(404).json({ message: 'Currency not found' });
    cur.name = payload.name || cur.name;
    cur.code = payload.code || cur.code;
    cur.symbol = typeof payload.symbol !== 'undefined' ? payload.symbol : cur.symbol;
    cur.countries = Array.isArray(payload.countries) ? payload.countries : cur.countries;
    cur.exchangeRate = typeof payload.exchangeRate !== 'undefined' ? Number(payload.exchangeRate) : cur.exchangeRate;
    cur.tier = payload.tier || cur.tier;
    cur.buyingPrice = typeof payload.buyingPrice !== 'undefined' ? (payload.buyingPrice && payload.buyingPrice !== '' ? Number(payload.buyingPrice) : null) : cur.buyingPrice;
    cur.sellingPrice = typeof payload.sellingPrice !== 'undefined' ? (payload.sellingPrice && payload.sellingPrice !== '' ? Number(payload.sellingPrice) : null) : cur.sellingPrice;
    cur.priceType = payload.priceType || cur.priceType || 'fixed';
    cur.updatedAt = new Date();
    await cur.save();
    res.json({ message: 'Currency updated', currency: cur });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const cur = await Currency.findByIdAndDelete(id);
    if (!cur) return res.status(404).json({ message: 'Currency not found' });
    res.json({ message: 'Currency deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pairwise ExchangeRate CRUD
export const createExchangeRate = async (req, res) => {
  try {
    const { fromCode, toCode, buyingPrice, sellingPrice, priceType } = req.body;
    if (!fromCode || !toCode) return res.status(400).json({ message: 'fromCode and toCode are required' });
    const existing = await ExchangeRate.findOne({ fromCode: fromCode.toUpperCase(), toCode: toCode.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'Exchange rate for this pair already exists' });
    const er = new ExchangeRate({
      fromCode: fromCode.toUpperCase(),
      toCode: toCode.toUpperCase(),
      buyingPrice: buyingPrice !== undefined && buyingPrice !== '' ? Number(buyingPrice) : null,
      sellingPrice: sellingPrice !== undefined && sellingPrice !== '' ? Number(sellingPrice) : null,
      priceType: priceType || 'fixed'
    });
    await er.save();
    res.json({ message: 'Exchange rate created', exchangeRate: er });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getExchangeRates = async (req, res) => {
  try {
    const { fromCode, toCode } = req.query;
    const filter = {};
    if (fromCode) filter.fromCode = fromCode.toUpperCase();
    if (toCode) filter.toCode = toCode.toUpperCase();
    const list = await ExchangeRate.find(filter).sort({ fromCode: 1, toCode: 1 });
    res.json({ exchangeRates: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const er = await ExchangeRate.findById(id);
    if (!er) return res.status(404).json({ message: 'Exchange rate not found' });
    er.fromCode = payload.fromCode ? payload.fromCode.toUpperCase() : er.fromCode;
    er.toCode = payload.toCode ? payload.toCode.toUpperCase() : er.toCode;
    er.buyingPrice = typeof payload.buyingPrice !== 'undefined' ? (payload.buyingPrice !== '' ? Number(payload.buyingPrice) : null) : er.buyingPrice;
    er.sellingPrice = typeof payload.sellingPrice !== 'undefined' ? (payload.sellingPrice !== '' ? Number(payload.sellingPrice) : null) : er.sellingPrice;
    er.priceType = payload.priceType || er.priceType;
    er.updatedAt = new Date();
    await er.save();
    res.json({ message: 'Exchange rate updated', exchangeRate: er });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;
    const er = await ExchangeRate.findByIdAndDelete(id);
    if (!er) return res.status(404).json({ message: 'Exchange rate not found' });
    res.json({ message: 'Exchange rate deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getStateSettings = async (req, res) => {
  try {
    const states = await StateSetting.find().sort({ name: 1 });
    res.json({ states });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateStateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, commissionPercent } = req.body;
    const state = await StateSetting.findById(id);
    if (!state) return res.status(404).json({ message: 'State not found' });
    if (name) state.name = name;
    if (typeof commissionPercent !== 'undefined') state.commissionPercent = Number(commissionPercent) || 0;
    state.updatedAt = new Date();
    await state.save();
    res.json({ message: 'State updated', state });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteStateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await StateSetting.findByIdAndDelete(id);
    if (!state) return res.status(404).json({ message: 'State not found' });
    res.json({ message: 'State deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin -> Admin send within/between states
export const sendMoneyBetweenAdminsByState = async (req, res) => {
  try {
    const senderId = req.userId;
    const { toAdminId, amount: amtRaw, stateId, deductCommissionFromAmount, currencyId } = req.body;
    const amount = parseFloat(amtRaw);
    if (!toAdminId || isNaN(amount) || amount <= 0) return res.status(400).json({ message: 'toAdminId and valid amount required' });

    const sender = await User.findById(senderId);
    const receiver = await User.findById(toAdminId);
    if (!sender || sender.role !== 'admin') return res.status(403).json({ message: 'Sender must be an admin' });
    if (!receiver || receiver.role !== 'admin') return res.status(404).json({ message: 'Destination admin not found' });

    const state = await StateSetting.findById(stateId);
    const percent = state ? Number(state.commissionPercent || 0) : 0;
    const commissionAmount = Math.round((amount * (percent / 100)) * 100) / 100; // 2 decimals

    // Apply transfer logic (admins have unlimited send rights - no balance check needed)
    let companyCommission = 0;
    let senderCommissionGiven = 0;
    let senderDebit = amount;
    let receiverCredit = amount;

    if (deductCommissionFromAmount) {
      // receiver gets amount less commission, sender gets commission as admin commission
      senderCommissionGiven = commissionAmount;
      receiverCredit = Math.round((amount - commissionAmount) * 100) / 100;
      senderDebit = amount;
    } else {
      // sender sends (amount - commission), receiver gets full amount, sender gets commission credit
      senderCommissionGiven = commissionAmount;
      senderDebit = Math.round((amount - commissionAmount) * 100) / 100;
      receiverCredit = amount;
    }

    // Update sender balance only and create a PENDING transaction
    const currentSenderBalance = parseFloat(sender.balance) || 0;
    sender.balance = Math.round((currentSenderBalance - senderDebit) * 100) / 100;
    await sender.save();

    // attach currency if provided
    let currencyCode = null;
    let currencySymbol = null;
    let exchangeRate = 1;
    let currencyTier = null;
    if (currencyId) {
      try {
        const cur = await Currency.findById(currencyId);
        if (cur) {
          currencyCode = cur.code;
          currencySymbol = cur.symbol;
          exchangeRate = Number(cur.exchangeRate) || 1;
          currencyTier = cur.tier || cur.name;
        }
      } catch (e) {
        console.warn('Currency lookup failed', e.message);
      }
    }

    // Create pending transaction record (receiver will confirm to complete)
    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      sender: senderId,
      receiver: toAdminId,
      amount,
      type: 'admin_state_push',
      status: 'pending',
      description: `Admin transfer using state ${state?.name || stateId}`,
      commission: senderCommissionGiven,
      commissionPercent: senderCommissionGiven ? percent : 0,
      companyCommission: companyCommission,
      companyCommissionPercent: companyCommission ? percent : 0,
      receiverCredit: receiverCredit,
      currencyCode,
      currencySymbol,
      exchangeRate,
      currencyTier,
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      senderLocation: sender.currentLocation || null,
      receiverLocation: receiver.currentLocation || null
    });

    await transaction.save();

    console.log('Pending transaction created:', {
      _id: transaction._id,
      sender: transaction.sender,
      receiver: transaction.receiver,
      type: transaction.type,
      commission: transaction.commission,
      amount: transaction.amount,
      receiverCredit: transaction.receiverCredit
    });

    // Notifications (inform receiver there's a pending transfer)
    const notifTo = new Notification({
      recipient: toAdminId,
      title: 'Admin Transfer Pending',
      message: `You have a pending transfer of SSP ${receiverCredit.toFixed(2)} from admin ${sender.name}`,
      type: 'system',
      relatedTransaction: transaction._id
    });
    const notifFrom = new Notification({
      recipient: senderId,
      title: 'Admin Transfer Created',
      message: `You created a pending transfer of SSP ${amount.toFixed(2)} to admin ${receiver.name}`,
      type: 'system',
      relatedTransaction: transaction._id
    });
    await notifFrom.save();
    await notifTo.save();

    try { await sendSMS(receiver.phone, `MoneyPay: You have a pending transfer of SSP ${receiverCredit.toFixed(2)} from admin ${sender.name}`); } catch (e) {}
    try { await sendSMS(sender.phone, `MoneyPay: You created a pending transfer of SSP ${amount.toFixed(2)} to admin ${receiver.name}`); } catch (e) {}

    // Emit socket update for sender balance only
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${senderId}`).emit('balance-updated', { userId: senderId, balance: sender.balance });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({ message: 'Transfer created and pending', transactionId: transaction.transactionId, transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const withdrawFromUser = async (req, res) => {
  try {
    const { userId, description } = req.body;
    const amount = parseFloat(req.body.amount);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate user balance exists
    if (user.balance === undefined || user.balance === null) {
      return res.status(500).json({ message: 'User balance is invalid' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient user balance' });
    }

    user.balance -= amount;
    await user.save();

    const transactionId = generateTransactionId();
    const admin = await User.findById(req.userId);
    const transaction = new Transaction({
      transactionId,
      sender: userId,
      receiver: req.userId,
      amount,
      type: 'withdrawal',
      status: 'completed',
      description,
      senderBalance: user.balance,
      receiverBalance: 0,
      senderLocation: user.currentLocation || null,
      receiverLocation: admin?.currentLocation || null
    });

    await transaction.save();

    const notification = new Notification({
      recipient: userId,
      title: 'Withdrawal Processed',
      message: `SSP ${amount} has been withdrawn from your account`,
      type: 'system',
      relatedTransaction: transaction._id
    });

    await notification.save();

    try {
      await sendSMS(user.phone, `MoneyPay: SSP ${amount} has been withdrawn from your account`);
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({
      message: 'Withdrawal successful',
      transaction: { _id: transaction._id, transactionId, amount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const withdrawFromAgent = async (req, res) => {
  try {
    const { agentId, description } = req.body;
    const amount = parseFloat(req.body.amount);
    const adminId = req.userId;

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (agent.role !== 'agent') {
      return res.status(400).json({ message: 'Specified user is not an agent' });
    }

    // Validate agent balance exists
    if (agent.balance === undefined || agent.balance === null) {
      return res.status(500).json({ message: 'Agent balance is invalid' });
    }

    if (agent.balance < amount) {
      return res.status(400).json({ message: 'Insufficient agent balance' });
    }

    // If agent does NOT allow instant admin cashouts (autoAdminCashout = false), approval IS needed
    // Send request to agent for approval
    if (!agent.autoAdminCashout) {
      const request = new WithdrawalRequest({
        agent: agentId,
        user: adminId,
        amount: amount,
        commission: 0,
        commissionPercent: 0,
        companyCommission: 0,
        companyCommissionPercent: 0,
        status: 'pending',
        description: 'Admin cash out request'
      });

      await request.save();

      // Notify agent of withdrawal request
      const notification = new Notification({
        recipient: agentId,
        title: 'Cash Out Request from Admin',
        message: `Admin requested to cash out SSP ${amount} from your agent account. Please approve or reject.`,
        type: 'withdrawal_request',
        relatedTransaction: request._id
      });

      await notification.save();

      // Emit socket event so agent gets a real-time notification
      try {
        const io = getIO();
        if (io) {
          io.to(`user-${agentId}`).emit('new-notification', {
            recipient: agentId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            relatedTransaction: request._id
          });
        }
      } catch (err) {
        console.error('Socket emit failed:', err);
      }

      try {
        await sendSMS(agent.phone, `MoneyPay: Admin requested to cash out SSP ${amount} from your agent account. Please approve or reject.`);
      } catch (err) {
        console.error('SMS failed:', err);
      }

      return res.json({
        message: 'Cash out request created and sent to agent for approval',
        request: {
          _id: request._id,
          amount: request.amount,
          status: request.status
        }
      });
    }

    // If agent allows instant admin cashouts (autoAdminCashout = true), process immediately
    if (agent.autoAdminCashout) {
      const parsedAmount = parseFloat(amount) || 0;
      const agentBalance = parseFloat(agent.balance) || 0;
      if (agentBalance < parsedAmount) {
        return res.status(400).json({ message: 'Insufficient agent balance' });
      }

      // Get admin user to credit
      const admin = await User.findById(adminId);
      if (!admin) return res.status(404).json({ message: 'Admin not found' });

      const adminBalance = parseFloat(admin.balance) || 0;

      // Update balances
      agent.balance = agentBalance - parsedAmount;
      admin.balance = adminBalance + parsedAmount;

      await agent.save();
      await admin.save();

      // Create transaction
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        transactionId,
        sender: agentId,
        receiver: adminId,
        amount: parsedAmount,
        type: 'agent_cash_out_money',
        status: 'completed',
        commission: 0,
        commissionPercent: 0,
        companyCommission: 0,
        companyCommissionPercent: 0,
        senderBalance: agent.balance,
        receiverBalance: admin.balance,
        senderLocation: agent.currentLocation || null,
        receiverLocation: admin.currentLocation || null
      });

      await transaction.save();

      const notification = new Notification({
        recipient: agentId,
        title: 'Admin Cash Out Processed',
        message: `Admin cashed out SSP ${parsedAmount} from your agent account.`,
        type: 'transaction',
        relatedTransaction: transaction._id
      });

      await notification.save();

      try { await sendSMS(agent.phone, `MoneyPay: Admin cashed out SSP ${parsedAmount} from your account.`); } catch (e) { console.error('SMS failed:', e); }

      // Emit socket events
      try {
        const io = getIO();
        if (io) {
          io.to(`user-${agentId}`).emit('balance-updated', { userId: agentId, balance: agent.balance });
          io.to(`user-${adminId}`).emit('balance-updated', { userId: adminId, balance: admin.balance });
          io.to(`user-${agentId}`).emit('new-notification', { recipient: agentId, title: notification.title, message: notification.message, type: notification.type });
        }
      } catch (err) {
        console.error('Socket emit failed:', err);
      }

      return res.json({ message: 'Cash out processed', agent });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const findAgentByAgentId = async (req, res) => {
  try {
    const { agentId } = req.query;

    if (!agentId) {
      return res.status(400).json({ message: 'agentId is required' });
    }

    const agent = await User.findOne({ agentId }).select('_id name phone balance role isVerified autoAdminCashout currentLocation');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (agent.role !== 'agent') {
      return res.status(400).json({ message: 'Specified user is not an agent' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('sender', 'name phone role')
      .populate('receiver', 'name phone role')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isSuspended: true, updatedAt: new Date() },
      { new: true }
    );

    const notification = new Notification({
      recipient: userId,
      title: 'Account Suspended',
      message: 'Your account has been suspended. Contact support for details.',
      type: 'alert'
    });

    await notification.save();

    try {
      const foundUser = await User.findById(userId);
      await sendSMS(foundUser.phone, 'MoneyPay: Your account has been suspended');
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({ message: 'User suspended', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unsuspendUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isSuspended: false, updatedAt: new Date() },
      { new: true }
    );

    const notification = new Notification({
      recipient: userId,
      title: 'Account Restored',
      message: 'Your account has been restored. You can now access all features.',
      type: 'system'
    });

    await notification.save();

    try {
      const foundUser = await User.findById(userId);
      await sendSMS(foundUser.phone, 'MoneyPay: Your account has been restored');
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({ message: 'User unsuspended', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const adminCashOutStats = await Transaction.aggregate([
      {
        $match: { type: 'agent_cash_out_money' }
      },
      {
        $group: {
          _id: null,
          totalCashedOut: { $sum: '$amount' }
        }
      }
    ]);

    const companyBenefitsStats = await Transaction.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalCompanyCommission: { $sum: '$companyCommission' }
        }
      }
    ]);

    res.json({
      totalUsers,
      totalTransactions,
      totalVolume: transactionStats[0]?.totalAmount || 0,
      completedTransactions: transactionStats[0]?.completedCount || 0,
      pendingTransactions: transactionStats[0]?.pendingCount || 0,
      usersByRole,
      totalAdminCashOut: adminCashOutStats[0]?.totalCashedOut || 0,
      companyBenefits: companyBenefitsStats[0]?.totalCompanyCommission || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const grantLocationPermissionToAll = async (req, res) => {
  try {
    const result = await User.updateMany({}, { adminLocationConsent: true, updatedAt: new Date() });
    res.json({ message: 'Admin location consent granted to all users', modifiedCount: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCommission = async (req, res) => {
  try {
    const doc = await Commission.findOne();
    res.json({
      percent: doc?.percent || 0,
      sendPercent: doc?.sendPercent || 0,
      withdrawPercent: doc?.withdrawPercent || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setCommission = async (req, res) => {
  try {
    const { percent, sendPercent, withdrawPercent } = req.body;

    let doc = await Commission.findOne();
    if (!doc) {
      doc = new Commission({
        percent: typeof percent === 'number' ? percent : 0,
        sendPercent: typeof sendPercent === 'number' ? sendPercent : (typeof percent === 'number' ? percent : 0),
        withdrawPercent: typeof withdrawPercent === 'number' ? withdrawPercent : (typeof percent === 'number' ? percent : 0)
      });
    } else {
      if (typeof percent === 'number') doc.percent = percent;
      if (typeof sendPercent === 'number') doc.sendPercent = sendPercent;
      if (typeof withdrawPercent === 'number') doc.withdrawPercent = withdrawPercent;
      doc.updatedAt = new Date();
    }

    await doc.save();

    res.json({
      message: 'Commission saved',
      percent: doc.percent,
      sendPercent: doc.sendPercent,
      withdrawPercent: doc.withdrawPercent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request agent withdrawal (pending agent approval)
export const requestAgentWithdrawal = async (req, res) => {
  try {
    const { agentId, amount } = req.body;
    const adminId = req.userId;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({ message: 'Agent not found' });
    }

    // Validate agent balance exists
    if (agent.balance === undefined || agent.balance === null) {
      return res.status(500).json({ message: 'Agent balance is invalid' });
    }

    if (agent.balance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient agent balance' });
    }

    // If agent allows instant admin cashouts, process immediately
    if (agent.autoAdminCashout) {
      const amountToProcess = parsedAmount || 0;
      const agentBalance = parseFloat(agent.balance) || 0;
      if (agentBalance < amountToProcess) {
        return res.status(400).json({ message: 'Insufficient agent balance' });
      }

      const admin = await User.findById(adminId);
      if (!admin) return res.status(404).json({ message: 'Admin not found' });

      const adminBalance = parseFloat(admin.balance) || 0;

      agent.balance = agentBalance - amountToProcess;
      admin.balance = adminBalance + amountToProcess;

      await agent.save();
      await admin.save();

      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        transactionId,
        sender: agentId,
        receiver: adminId,
        amount: amountToProcess,
        type: 'agent_cash_out_money',
        status: 'completed',
        commission: 0,
        commissionPercent: 0,
        companyCommission: 0,
        companyCommissionPercent: 0,
        senderBalance: agent.balance,
        receiverBalance: admin.balance,
        senderLocation: agent.currentLocation || null,
        receiverLocation: admin.currentLocation || null
      });

      await transaction.save();

      const notification = new Notification({
        recipient: agentId,
        title: 'Withdrawal Processed by Admin',
        message: `Admin withdrew SSP ${amountToProcess} from your account.`,
        type: 'transaction',
        relatedTransaction: transaction._id
      });

      await notification.save();

      try { await sendSMS(agent.phone, `MoneyPay: Admin withdrew SSP ${amountToProcess} from your account.`); } catch (e) { console.error('SMS failed:', e); }

      try {
        const io = getIO();
        if (io) {
          io.to(`user-${agentId}`).emit('balance-updated', { userId: agentId, balance: agent.balance });
          io.to(`user-${adminId}`).emit('balance-updated', { userId: adminId, balance: admin.balance });
        }
      } catch (err) {
        console.error('Socket emit failed:', err);
      }

      return res.json({ message: 'Withdrawal processed', agent });
    }

    // For admin cash-out requests from agent, do NOT charge commission — create a pending request
    const request = new WithdrawalRequest({
      agent: agentId,
      user: adminId,
      amount: parsedAmount,
      commission: 0,
      commissionPercent: 0,
      companyCommission: 0,
      companyCommissionPercent: 0,
      status: 'pending'
    });

    await request.save();

    // Notify agent of withdrawal request
    const notification = new Notification({
      recipient: agentId,
      title: 'Withdrawal Request from Admin',
      message: `Admin requested to withdraw SSP ${parsedAmount} from your account. Please approve or reject.`,
      type: 'withdrawal_request',
      relatedTransaction: request._id
    });

    await notification.save();

    try {
      await sendSMS(agent.phone, `MoneyPay: Admin requested to withdraw SSP ${parsedAmount} from your account. Please approve or reject.`);
    } catch (err) {
      console.error('SMS failed:', err);
    }

    res.json({
      message: 'Withdrawal request created and sent to agent',
      request: {
        _id: request._id,
        amount: request.amount,
        status: request.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agent approves admin withdrawal request
export const approveAdminWithdrawalRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const agentId = req.userId;

    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.agent.toString() !== agentId) {
      return res.status(403).json({ message: 'Only the agent can approve their withdrawal' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Validate agent balance exists
    if (agent.balance === undefined || agent.balance === null) {
      return res.status(500).json({ message: 'Agent balance is invalid' });
    }

    // Coerce numeric values to avoid issues when amounts or balances are strings
    const parsedAmount = parseFloat(request.amount) || 0;

    // Ensure agent balance is numeric
    const agentBalance = parseFloat(agent.balance) || 0;

    // Check balance again (only debit the request amount)
    const totalDebit = parsedAmount;
    if (agentBalance < totalDebit) {
      request.status = 'rejected';
      request.rejectedAt = new Date();
      await request.save();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Get the admin user to credit their balance
    const admin = await User.findById(request.user);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Ensure admin balance is numeric
    const adminBalance = parseFloat(admin.balance) || 0;

    // Process withdrawal: update agent balance and save
    agent.balance = agentBalance - totalDebit;
    await agent.save();

    // Credit admin's balance and save
    admin.balance = adminBalance + parsedAmount;
    await admin.save();

    // Create transaction
    const transactionId = generateTransactionId();
    const transaction = new Transaction({
      transactionId,
      sender: agentId,
      receiver: request.user,
      amount: parsedAmount,
      type: 'agent_cash_out_money',
      status: 'completed',
      commission: request.commission,
      commissionPercent: request.commissionPercent,
      companyCommission: request.companyCommission || 0,
      companyCommissionPercent: request.companyCommissionPercent || 0,
      senderBalance: agent.balance,
      receiverBalance: admin.balance || 0,
      senderLocation: agent.currentLocation || null,
      receiverLocation: admin.currentLocation || null
    });

    await transaction.save();

    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date();
    await request.save();

    // Notify
    const notification = new Notification({
      recipient: agentId,
      title: 'Withdrawal Approved',
      message: `Your withdrawal of SSP ${request.amount} has been completed.`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    await notification.save();

    try {
      await sendSMS(agent.phone, `MoneyPay: Your withdrawal of SSP ${request.amount} has been completed.`);
    } catch (err) {
      console.error('SMS failed:', err);
    }

    // Emit socket events to update connected clients about balance change and new notification
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${agentId}`).emit('balance-updated', {
          userId: agentId,
          balance: agent.balance
        });

        io.to(`user-${request.user}`).emit('balance-updated', {
          userId: request.user,
          balance: admin.balance
        });

        io.to(`user-${agentId}`).emit('new-notification', {
          recipient: agentId,
          title: notification.title,
          message: notification.message,
          type: notification.type
        });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({
      message: 'Withdrawal approved and processed',
      transaction: { _id: transaction._id, transactionId, amount: request.amount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agent rejects admin withdrawal request
export const rejectAdminWithdrawalRequest = async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    const agentId = req.userId;

    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.agent.toString() !== agentId) {
      return res.status(403).json({ message: 'Only the agent can reject their withdrawal' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.reason = reason;
    await request.save();

    // Notify
    const notification = new Notification({
      recipient: agentId,
      title: 'Withdrawal Rejected',
      message: `You rejected the admin withdrawal request of SSP ${request.amount}`,
      type: 'system'
    });

    await notification.save();

    // Emit socket event to notify admin their request was rejected
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${request.user}`).emit('new-notification', {
          recipient: request.user,
          title: 'Withdrawal Request Rejected',
          message: `Agent rejected your withdrawal request of SSP ${request.amount}`,
          type: 'system'
        });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({ message: 'Withdrawal request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending admin withdrawal requests for agent
export const getAgentWithdrawalRequests = async (req, res) => {
  try {
    const agentId = req.userId;

    const requests = await WithdrawalRequest.find({
      agent: agentId,
      status: 'pending'
    })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pushMoneyBetweenUsers = async (req, res) => {
  try {
    const { fromPhone, toPhone, amount: amtRaw, description } = req.body;
    const amount = parseFloat(amtRaw);
    if (!fromPhone || !toPhone || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'fromPhone, toPhone and valid amount are required' });
    }

    if (fromPhone === toPhone) {
      return res.status(400).json({ message: 'Source and destination cannot be the same' });
    }

    const fromUser = await User.findOne({ phone: fromPhone });
    const toUser = await User.findOne({ phone: toPhone });

    if (!fromUser) return res.status(404).json({ message: 'Source user not found' });
    if (!toUser) return res.status(404).json({ message: 'Destination user not found' });

    // Validate balances exist
    if (fromUser.balance === undefined || fromUser.balance === null) {
      return res.status(500).json({ message: 'Source user balance is invalid' });
    }
    if (toUser.balance === undefined || toUser.balance === null) {
      return res.status(500).json({ message: 'Destination user balance is invalid' });
    }

    if (fromUser.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance on source user' });
    }

    // Adjust balances
    fromUser.balance -= amount;
    toUser.balance += amount;

    await fromUser.save();
    await toUser.save();

    // Create transaction record
    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      sender: fromUser._id,
      receiver: toUser._id,
      amount,
      type: 'admin_push',
      status: 'completed',
      description: description || `Admin pushed money from ${fromPhone} to ${toPhone}`,
      senderBalance: fromUser.balance,
      receiverBalance: toUser.balance,
      senderLocation: fromUser.currentLocation || null,
      receiverLocation: toUser.currentLocation || null
    });

    await transaction.save();

    // Notifications
    const notifFrom = new Notification({
      recipient: fromUser._id,
      title: 'Debit by Admin',
      message: `SSP ${amount.toFixed(2)} was debited from your account by admin`,
      type: 'system',
      relatedTransaction: transaction._id
    });
    const notifTo = new Notification({
      recipient: toUser._id,
      title: 'Credit by Admin',
      message: `SSP ${amount.toFixed(2)} was credited to your account by admin`,
      type: 'system',
      relatedTransaction: transaction._id
    });

    await notifFrom.save();
    await notifTo.save();

    // Try SMS (non-blocking)
    try { await sendSMS(fromUser.phone, `MoneyPay: SSP ${amount.toFixed(2)} debited from your account by admin.`); } catch (e) { }
    try { await sendSMS(toUser.phone, `MoneyPay: SSP ${amount.toFixed(2)} credited to your account by admin.`); } catch (e) { }

    res.json({ message: 'Transfer completed', transactionId: transaction.transactionId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTieredCommission = async (req, res) => {
  try {
    const doc = await TieredCommission.findOne({ type: 'send-money' });
    if (!doc) {
      // Return default tiers if not set
      const defaultSendTiers = [
        { minAmount: 100, companyPercent: 1 },
        { minAmount: 200, companyPercent: 2 },
        { minAmount: 300, companyPercent: 3 },
        { minAmount: 400, companyPercent: 4 },
        { minAmount: 500, companyPercent: 5 },
        { minAmount: 600, companyPercent: 6 },
        { minAmount: 700, companyPercent: 7 },
        { minAmount: 800, companyPercent: 8 },
        { minAmount: 900, companyPercent: 9 },
        { minAmount: 1000, companyPercent: 10 }
      ];
      const defaultWithdrawalTiers = [
        { minAmount: 100, agentPercent: 1, companyPercent: 0 },
        { minAmount: 200, agentPercent: 2, companyPercent: 0 },
        { minAmount: 300, agentPercent: 3, companyPercent: 0 },
        { minAmount: 400, agentPercent: 4, companyPercent: 0 },
        { minAmount: 500, agentPercent: 5, companyPercent: 0 },
        { minAmount: 600, agentPercent: 6, companyPercent: 0 },
        { minAmount: 700, agentPercent: 7, companyPercent: 0 },
        { minAmount: 800, agentPercent: 8, companyPercent: 0 },
        { minAmount: 900, agentPercent: 9, companyPercent: 0 },
        { minAmount: 1000, agentPercent: 10, companyPercent: 0 }
      ];
      return res.json({
        type: 'send-money',
        tiers: defaultSendTiers,
        withdrawalTiers: defaultWithdrawalTiers
      });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return the total 'agent_cash_out_money' amount received by the logged-in admin
export const getMyAdminCashOut = async (req, res) => {
  try {
    const adminId = req.userId;
    const agg = await Transaction.aggregate([
      { $match: { type: 'agent_cash_out_money', receiver: mongoose.Types.ObjectId(adminId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const total = agg[0]?.total || 0;
    res.json({ totalAdminCashOut: total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return total commission earned by the logged-in admin from admin_state_push transfers
export const getMyAdminCommission = async (req, res) => {
  try {
    const adminId = req.userId;
    const agg = await Transaction.aggregate([
      { $match: { sender: new mongoose.Types.ObjectId(adminId), commission: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$commission' } } }
    ]);
    const total = agg[0]?.total || 0;
    res.json({ totalAdminCommission: total });
  } catch (err) {
    console.error('getMyAdminCommission error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get pending send-by-state transactions
export const getPendingSendByState = async (req, res) => {
  try {
    // Return admin_state_push transactions that are still relevant to the pending UI.
    // Include pending, completed and cancelled so rows remain visible after actions.
    const pending = await Transaction.find({
      type: 'admin_state_push',
      status: { $in: ['pending', 'completed', 'cancelled'] }
    })
      .populate('sender', 'name phone')
      .populate('receiver', 'name phone')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Receiver marks pending send as received -> credits receiver and completes txn
export const receiveSendByState = async (req, res) => {
  try {
    const adminId = req.userId;
    const { id } = req.params;
    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.type !== 'admin_state_push') return res.status(400).json({ message: 'Invalid transaction type' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Transaction is not pending' });
    if (String(tx.receiver) !== String(adminId)) return res.status(403).json({ message: 'Only the receiver can mark as received' });

    const receiver = await User.findById(adminId);
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    // Credit receiver with stored receiverCredit
    const receiverCredit = Number(tx.receiverCredit || tx.amount || 0);
    receiver.balance = Math.round(((parseFloat(receiver.balance) || 0) + receiverCredit) * 100) / 100;
    await receiver.save();

    // Update transaction
    tx.status = 'completed';
    tx.receiverBalance = receiver.balance;
    await tx.save();

    // Notifications
    const notifTo = new Notification({
      recipient: adminId,
      title: 'Transfer Received',
      message: `You received SSP ${receiverCredit.toFixed(2)} from admin transfer`,
      type: 'system',
      relatedTransaction: tx._id
    });
    await notifTo.save();

    try { await sendSMS(receiver.phone, `MoneyPay: You have received SSP ${receiverCredit.toFixed(2)}`); } catch (e) {}

    // Emit socket update for receiver
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${adminId}`).emit('balance-updated', { userId: adminId, balance: receiver.balance });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({ message: 'Transaction marked as received', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return count of pending send-by-state transactions for logged-in admin (receiver)
export const getPendingSendByStateCount = async (req, res) => {
  try {
    const adminId = req.userId;
    // Use string id for receiver to avoid ObjectId cast errors when req.userId is missing/invalid
    const query = { type: 'admin_state_push', status: 'pending', receiver: adminId };
    const count = await Transaction.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Sender cancels a pending send-by-state transaction
export const cancelSendByState = async (req, res) => {
  try {
    const adminId = req.userId;
    const { id } = req.params;
    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.type !== 'admin_state_push') return res.status(400).json({ message: 'Invalid transaction type' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Transaction is not pending' });
    if (String(tx.sender) !== String(adminId)) return res.status(403).json({ message: 'Only the sender can cancel this transfer' });

    const sender = await User.findById(tx.sender);
    const receiver = await User.findById(tx.receiver);
    if (!sender) return res.status(404).json({ message: 'Sender not found' });

    // Compute how much was debited from sender when creating the pending tx
    const amount = Number(tx.amount || 0);
    const commission = Number(tx.commission || 0);
    // If companyCommission exists it means commission was deducted from amount
    const wasDeductedFromAmount = Number(tx.companyCommission || 0) > 0;
    const senderDebit = wasDeductedFromAmount ? amount : Math.round((amount - commission) * 100) / 100;

    // Refund sender
    sender.balance = Math.round(((parseFloat(sender.balance) || 0) + senderDebit) * 100) / 100;
    await sender.save();

    // Zero out any commission values so cancelled tx doesn't count toward aggregates
    tx.status = 'cancelled';
    tx.cancelledAt = new Date();
    tx.senderBalance = sender.balance;
    tx.commission = 0;
    tx.commissionPercent = 0;
    tx.companyCommission = 0;
    tx.companyCommissionPercent = 0;
    await tx.save();

    // Notifications
    const notifSender = new Notification({
      recipient: sender._id,
      title: 'Transfer Cancelled',
      message: `You cancelled the pending transfer of SSP ${amount.toFixed(2)}`,
      type: 'system',
      relatedTransaction: tx._id
    });
    await notifSender.save();

    if (receiver) {
      const notifReceiver = new Notification({
        recipient: receiver._id,
        title: 'Pending Transfer Cancelled',
        message: `Pending transfer of SSP ${tx.receiverCredit ? Number(tx.receiverCredit).toFixed(2) : amount.toFixed(2)} was cancelled by sender`,
        type: 'system',
        relatedTransaction: tx._id
      });
      await notifReceiver.save();
    }

    try { await sendSMS(sender.phone, `MoneyPay: Your pending transfer of SSP ${amount.toFixed(2)} was cancelled and refunded.`); } catch (e) { }
    try { if (receiver) await sendSMS(receiver.phone, `MoneyPay: Pending transfer of SSP ${tx.receiverCredit ? Number(tx.receiverCredit).toFixed(2) : amount.toFixed(2)} was cancelled by sender.`); } catch (e) { }

    // Emit socket update for sender (and receiver if connected)
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${sender._id}`).emit('balance-updated', { userId: sender._id, balance: sender.balance });
        if (receiver) io.to(`user-${receiver._id}`).emit('transaction-updated', { transactionId: tx._id, status: tx.status });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({ message: 'Pending transfer cancelled', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Sender edits pending transaction details (currently only description)
export const editSendByState = async (req, res) => {
  try {
    const adminId = req.userId;
    const { id } = req.params;
    const { description, amount, toAdminId, deductCommissionFromAmount } = req.body;

    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.type !== 'admin_state_push') return res.status(400).json({ message: 'Invalid transaction type' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Only pending transactions can be edited' });
    if (String(tx.sender) !== String(adminId)) return res.status(403).json({ message: 'Only the sender can edit this transaction' });

    // Fetch latest sender record
    const sender = await User.findById(tx.sender);
    if (!sender) return res.status(404).json({ message: 'Sender not found' });

    // Determine commission percent from existing tx (fallback to 0)
    const percent = Number(tx.commissionPercent || tx.companyCommissionPercent || 0);

    // Compute original sender debit
    const origCommission = Number(tx.commission || 0);
    const origCompanyCommission = Number(tx.companyCommission || 0);
    const originalSenderDebit = origCompanyCommission > 0 ? Number(tx.amount || 0) : Math.round(((Number(tx.amount || 0) - origCommission) * 100)) / 100;

    let newAmount = typeof amount !== 'undefined' ? parseFloat(amount) : Number(tx.amount || 0);
    if (isNaN(newAmount) || newAmount <= 0) newAmount = Number(tx.amount || 0);

    // If receiver changed, validate
    let newReceiverId = tx.receiver;
    if (toAdminId) {
      const newReceiver = await User.findById(toAdminId);
      if (!newReceiver || newReceiver.role !== 'admin') return res.status(404).json({ message: 'Destination admin not found' });
      newReceiverId = newReceiver._id;
    }

    const commissionAmount = Math.round((newAmount * (percent / 100)) * 100) / 100;

    let companyCommission = 0;
    let senderCommissionGiven = 0;
    let senderDebit = newAmount;
    let receiverCredit = newAmount;

    const deduct = deductCommissionFromAmount === true || deductCommissionFromAmount === 'true' || (typeof deductCommissionFromAmount === 'undefined' ? (origCompanyCommission > 0) : false);

    if (deduct) {
      companyCommission = commissionAmount;
      receiverCredit = Math.round((newAmount - commissionAmount) * 100) / 100;
      senderDebit = newAmount;
    } else {
      senderCommissionGiven = commissionAmount;
      senderDebit = Math.round((newAmount - commissionAmount) * 100) / 100;
      receiverCredit = newAmount;
    }

    // Compute delta to apply to sender balance
    const delta = Math.round((senderDebit - originalSenderDebit) * 100) / 100;
    if (delta > 0) {
      // Need additional funds from sender
      const currentSenderBalance = parseFloat(sender.balance) || 0;
      if (currentSenderBalance < delta) return res.status(400).json({ message: 'Insufficient sender balance for updated amount' });
      sender.balance = Math.round(((currentSenderBalance - delta) * 100)) / 100;
    } else if (delta < 0) {
      sender.balance = Math.round(((parseFloat(sender.balance) || 0) - delta) * 100) / 100; // delta negative => refund
    }

    await sender.save();

    // Apply updates to transaction
    tx.amount = newAmount;
    tx.receiver = newReceiverId;
    tx.description = typeof description !== 'undefined' ? description : tx.description;
    tx.commission = senderCommissionGiven;
    tx.commissionPercent = senderCommissionGiven ? percent : 0;
    tx.companyCommission = companyCommission;
    tx.companyCommissionPercent = companyCommission ? percent : 0;
    tx.receiverCredit = receiverCredit;
    tx.senderBalance = sender.balance;
    tx.updatedAt = new Date();

    await tx.save();

    // Notify parties
    const notifSender = new Notification({
      recipient: sender._id,
      title: 'Transfer Updated',
      message: `You updated the pending transfer ${tx.transactionId}`,
      type: 'system',
      relatedTransaction: tx._id
    });
    await notifSender.save();

    if (newReceiverId) {
      const notifReceiver = new Notification({
        recipient: newReceiverId,
        title: 'Pending Transfer Updated',
        message: `A pending transfer to you (SSP ${receiverCredit.toFixed(2)}) was updated by the sender.`,
        type: 'system',
        relatedTransaction: tx._id
      });
      await notifReceiver.save();
    }

    try {
      const io = getIO();
      if (io) {
        io.to(`user-${sender._id}`).emit('balance-updated', { userId: sender._id, balance: sender.balance });
        if (newReceiverId) io.to(`user-${newReceiverId}`).emit('transaction-updated', { transactionId: tx._id, status: tx.status });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({ message: 'Transaction updated', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const setTieredCommission = async (req, res) => {
  try {
    const { tiers, withdrawalTiers } = req.body;

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ message: 'Send tiers must be a non-empty array' });
    }

    if (!Array.isArray(withdrawalTiers) || withdrawalTiers.length === 0) {
      return res.status(400).json({ message: 'Withdrawal tiers must be a non-empty array' });
    }

    // Validate send tiers (only company percent)
    for (const tier of tiers) {
      if (typeof tier.minAmount !== 'number' || tier.minAmount < 0) {
        return res.status(400).json({ message: 'Each send tier must have a valid minAmount >= 0' });
      }
      if (typeof tier.companyPercent !== 'number' || tier.companyPercent < 0 || tier.companyPercent > 100) {
        return res.status(400).json({ message: 'Each send tier company percent must be between 0 and 100' });
      }
    }

    // Validate withdrawal tiers
    for (const tier of withdrawalTiers) {
      if (typeof tier.minAmount !== 'number' || tier.minAmount < 0) {
        return res.status(400).json({ message: 'Each withdrawal tier must have a valid minAmount >= 0' });
      }
      if (typeof tier.agentPercent !== 'number' || tier.agentPercent < 0 || tier.agentPercent > 100) {
        return res.status(400).json({ message: 'Each withdrawal tier agent percent must be between 0 and 100' });
      }
      if (typeof tier.companyPercent !== 'number' || tier.companyPercent < 0 || tier.companyPercent > 100) {
        return res.status(400).json({ message: 'Each withdrawal tier company percent must be between 0 and 100' });
      }
    }

    // Sort tiers by minAmount to maintain order
    tiers.sort((a, b) => a.minAmount - b.minAmount);
    withdrawalTiers.sort((a, b) => a.minAmount - b.minAmount);

    let doc = await TieredCommission.findOne({ type: 'send-money' });
    if (!doc) {
      doc = new TieredCommission({
        type: 'send-money',
        tiers,
        withdrawalTiers
      });
    } else {
      doc.tiers = tiers;
      doc.withdrawalTiers = withdrawalTiers;
      doc.updatedAt = new Date();
    }

    await doc.save();
    res.json({ message: 'Tiered commission saved', tiers: doc.tiers, withdrawalTiers: doc.withdrawalTiers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const createMoneyExchangeTransaction = async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency, convertedAmount, priceMode, pairUsed, description } = req.body;
    const adminId = req.userId; // from auth middleware

    // Validate required fields
    if (!amount || !fromCurrency || !toCurrency || convertedAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields: amount, fromCurrency, toCurrency, convertedAmount' });
    }

    // Generate unique transaction ID
    const transactionId = `ME-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const transaction = new Transaction({
      transactionId,
      sender: adminId,
      amount,
      type: 'money_exchange',
      status: 'completed',
      description: description || `${fromCurrency} → ${toCurrency} conversion`,
      currencyCode: fromCurrency,
      exchangeRate: pairUsed ? (pairUsed.inverse ? (1 / pairUsed.buyingPrice) : pairUsed.buyingPrice) : 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add metadata for the exchange in description or create a new field
    transaction.description = `${fromCurrency} to ${toCurrency}: ${amount} → ${convertedAmount} (${priceMode})`;
    if (pairUsed) {
      transaction.currencySymbol = pairUsed.toCode;
    }

    await transaction.save();

    res.status(201).json({
      message: 'Money exchange transaction saved successfully',
      transaction: {
        transactionId: transaction.transactionId,
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount,
        priceMode,
        status: 'completed',
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Money exchange error:', error);
    res.status(500).json({ message: 'Failed to save transaction: ' + error.message });
  }
};