import User from '../models/User.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import Commission from '../models/Commission.js';
import TieredCommission from '../models/TieredCommission.js';
import { generateTransactionId } from '../utils/helpers.js';
import { sendSMS } from '../utils/sms.js';
import { getIO } from '../utils/socket.js';

export const requestWithdrawalFromUser = async (req, res) => {
  try {
    const { userPhone, amount } = req.body;
    const agentId = req.userId;

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({ message: 'Only agents can request withdrawals' });
    }

    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (user.balance < parsedAmount) {
      return res.status(400).json({ message: 'User has insufficient balance' });
    }

    // Get commission — try tiered commission first, fall back to flat commission
    let agentCommissionPercent = 0;
    let companyCommissionPercent = 0;

    try {
      const tieredDoc = await TieredCommission.findOne({ type: 'send-money' });
      if (tieredDoc && tieredDoc.withdrawalTiers && tieredDoc.withdrawalTiers.length > 0) {
        // Find highest tier where minAmount >= amount
        const applicableTier = tieredDoc.withdrawalTiers
          .filter(t => t.minAmount >= parsedAmount)
          .sort((a, b) => a.minAmount - b.minAmount)[0];
        
        if (applicableTier) {
          agentCommissionPercent = applicableTier.agentPercent || 0;
          companyCommissionPercent = applicableTier.companyPercent || 0;
        }
      }
    } catch (err) {
      console.error('Failed to fetch tiered commission for withdrawal:', err);
    }

    // Fall back to flat commission if no tiered config
    if (agentCommissionPercent === 0 && companyCommissionPercent === 0) {
      const commissionDoc = await Commission.findOne();
      agentCommissionPercent = commissionDoc?.percent || 0;
      companyCommissionPercent = commissionDoc?.withdrawPercent ?? commissionDoc?.percent ?? 0;
    }

    const agentCommissionAmount = parseFloat(((parsedAmount * agentCommissionPercent) / 100).toFixed(2)) || 0;
    const companyCommissionAmount = parseFloat(((parsedAmount * companyCommissionPercent) / 100).toFixed(2)) || 0;

    // Create withdrawal request (pending user approval)
    const request = new WithdrawalRequest({
      agent: agentId,
      user: user._id,
      amount: parsedAmount,
      agentCommission: agentCommissionAmount,
      agentCommissionPercent: agentCommissionPercent,
      companyCommission: companyCommissionAmount,
      companyCommissionPercent: companyCommissionPercent,
      status: 'pending'
    });

    await request.save();

    // Notify user of withdrawal request
    const notification = new Notification({
      recipient: user._id,
      title: 'Withdrawal Request',
      message: `Agent ${agent.name} requested SSP ${parsedAmount} withdrawal. Commission: SSP ${agentCommissionAmount.toFixed(2)}`,
      type: 'withdrawal_request',
      relatedTransaction: request._id
    });

    await notification.save();

    try {
      await sendSMS(user.phone, `MoneyPay: Agent ${agent.name} requested SSP ${parsedAmount} withdrawal. Please approve or reject.`);
    } catch (err) {
      console.error('SMS failed:', err);
    }

    res.json({
      message: 'Withdrawal request created',
      request: {
        _id: request._id,
        amount: request.amount,
        agentCommission: request.agentCommission,
        agentCommissionPercent: request.agentCommissionPercent,
        companyCommission: request.companyCommission,
        companyCommissionPercent: request.companyCommissionPercent,
        status: request.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveWithdrawalRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.userId;

    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.user.toString() !== userId) {
      return res.status(403).json({ message: 'Only the user can approve their withdrawal' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Get user and agent
    const user = await User.findById(userId);
    const agent = await User.findById(request.agent);

    if (!user || !agent) {
      return res.status(404).json({ message: 'User or agent not found' });
    }

    // Check balance again
    const totalDebit = request.amount + (request.agentCommission || 0) + (request.companyCommission || 0);
    if (user.balance < totalDebit) {
      request.status = 'rejected';
      request.rejectedAt = new Date();
      await request.save();
      return res.status(400).json({ message: 'User no longer has sufficient balance' });
    }

    // Process withdrawal: deduct from user (amount + agent commission + company commission), credit agent with amount + agent commission
    user.balance -= totalDebit;
    // use agentCommission (new field) if available, fall back to legacy commission
    agent.balance = (agent.balance || 0) + request.amount + (request.agentCommission || request.commission || 0);

    await user.save();
    await agent.save();

    // Create transaction record
    const transactionId = generateTransactionId();
    const transaction = new Transaction({
      transactionId,
      sender: userId,
      receiver: request.agent,
      amount: request.amount,
      type: 'user_withdraw',
      status: 'completed',
      // legacy commission fields
      commission: request.commission || request.agentCommission || 0,
      commissionPercent: request.commissionPercent || request.agentCommissionPercent || 0,
      // agent-specific fields
      agentCommission: request.agentCommission || request.commission || 0,
      agentCommissionPercent: request.agentCommissionPercent || request.commissionPercent || 0,
      companyCommission: request.companyCommission || 0,
      companyCommissionPercent: request.companyCommissionPercent || 0,
      senderBalance: user.balance,
      receiverBalance: agent.balance
    });

    await transaction.save();

    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date();
    await request.save();

    // Create notifications
    const userNotif = new Notification({
      recipient: userId,
      title: 'Withdrawal Approved',
      message: `Your withdrawal of SSP ${request.amount} to ${agent.name} has been approved`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    const agentNotif = new Notification({
      recipient: request.agent,
      title: 'Withdrawal Approved',
      message: `${user.name} approved your withdrawal request of SSP ${request.amount}`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    await userNotif.save();
    await agentNotif.save();

    // Emit socket events
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('balance-updated', {
          userId,
          balance: user.balance
        });

        io.to(`user-${request.agent}`).emit('balance-updated', {
          userId: request.agent,
          balance: agent.balance
        });

        io.to(`user-${userId}`).emit('new-notification', {
          recipient: userId,
          title: userNotif.title,
          message: userNotif.message,
          type: userNotif.type
        });

        io.to(`user-${request.agent}`).emit('new-notification', {
          recipient: request.agent,
          title: agentNotif.title,
          message: agentNotif.message,
          type: agentNotif.type
        });
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({
      message: 'Withdrawal request approved',
      transaction: { _id: transaction._id, transactionId, amount: request.amount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectWithdrawalRequest = async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    const userId = req.userId;

    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.user.toString() !== userId) {
      return res.status(403).json({ message: 'Only the user can reject their withdrawal' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.reason = reason;
    await request.save();

    // Get user and agent for notification
    const user = await User.findById(userId);
    const agent = await User.findById(request.agent);

    // Create notifications
    const userNotif = new Notification({
      recipient: userId,
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request has been rejected`,
      type: 'system'
    });

    const agentNotif = new Notification({
      recipient: request.agent,
      title: 'Withdrawal Rejected',
      message: `${user.name} rejected your withdrawal request of SSP ${request.amount}`,
      type: 'system'
    });

    await userNotif.save();
    await agentNotif.save();

    // Emit socket events
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('new-notification', {
          recipient: userId,
          title: userNotif.title,
          message: userNotif.message,
          type: userNotif.type
        });

        io.to(`user-${request.agent}`).emit('new-notification', {
          recipient: request.agent,
          title: agentNotif.title,
          message: agentNotif.message,
          type: agentNotif.type
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

export const getPendingWithdrawalRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const requests = await WithdrawalRequest.find({
      user: userId,
      status: 'pending'
    })
      .populate('agent', 'name phone agentId')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
