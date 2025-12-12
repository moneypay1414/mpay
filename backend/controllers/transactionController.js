import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import { generateTransactionId } from '../utils/helpers.js';
import { sendSMS, sendTransactionSMS } from '../utils/sms.js';
import { getIO } from '../utils/socket.js';
import Commission from '../models/Commission.js';
import TieredCommission from '../models/TieredCommission.js';

export const sendMoney = async (req, res) => {
  try {
    const { recipientPhone, description } = req.body;
    const amount = parseFloat(req.body.amount);
    const sender = await User.findById(req.userId);

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // fetch company commission percent for send — try tiered commission first
    let companyPercent = 0;
    const tieredDoc = await TieredCommission.findOne({ type: 'send-money' });
    if (tieredDoc && tieredDoc.tiers.length > 0) {
      // Find the lowest tier whose minAmount >= amount (smallest qualifying tier)
      const applicableTier = tieredDoc.tiers
        .filter(t => t.minAmount >= amount)
        .sort((a, b) => a.minAmount - b.minAmount)[0];
      companyPercent = applicableTier ? applicableTier.companyPercent : 0;
    } else {
      // Fallback to old Commission model (flat sendPercent)
      const commissionDoc = await Commission.findOne();
      companyPercent = commissionDoc?.sendPercent ?? commissionDoc?.percent ?? 0;
    }
    const companyCommission = parseFloat(((amount * companyPercent) / 100).toFixed(2)) || 0;

    if (sender.balance < amount + companyCommission) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const recipient = await User.findOne({ phone: recipientPhone });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Restrict normal users from sending to agents or admins
    if (sender.role === 'user' && recipient.role && recipient.role !== 'user') {
      return res.status(400).json({ message: "You can't send money to this person" });
    }

    const transactionId = generateTransactionId();
    const senderPreviousBalance = sender.balance;
    const receiverPreviousBalance = recipient.balance;

    // Update balances (sender pays company fee in addition to amount)
    sender.balance -= (amount + companyCommission);
    recipient.balance += amount;

    await sender.save();
    await recipient.save();

    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      sender: req.userId,
      receiver: recipient._id,
      amount,
      type: 'transfer',
      status: 'completed',
      description,
      senderBalance: sender.balance,
      receiverBalance: recipient.balance,
      senderLocation: sender.currentLocation || null,
      receiverLocation: recipient.currentLocation || null,
      companyCommission,
      companyCommissionPercent: companyPercent
    });

    await transaction.save();

    // Create notifications
    const senderNotif = new Notification({
      recipient: req.userId,
      title: 'Money Sent',
      message: `You sent SSP ${amount} to ${recipient.phone}`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    const receiverNotif = new Notification({
      recipient: recipient._id,
      title: 'Money Received',
      message: `You received SSP ${amount} from ${sender.phone}`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    await senderNotif.save();
    await receiverNotif.save();

    // Send SMS
    try {
      await sendSMS(sender.phone, `MoneyPay: You sent SSP ${amount} to ${recipient.phone}. TX: ${transactionId}`);
      await sendSMS(recipient.phone, `MoneyPay: You received SSP ${amount} from ${sender.phone}. TX: ${transactionId}`);
    } catch (error) {
      console.error('SMS failed:', error);
    }

    // Emit real-time events: notifications and balance updates for sender and recipient
    try {
      const io = getIO();
      if (io) {
        // Sender notification + balance update
        io.to(`user-${req.userId}`).emit('new-notification', {
          recipient: req.userId,
          title: 'Money Sent',
          message: `You sent SSP ${amount} to ${recipient.phone}`,
          type: 'transaction',
          relatedTransaction: transaction._id
        });

        io.to(`user-${req.userId}`).emit('balance-updated', {
          userId: req.userId,
          balance: sender.balance
        });

        // Recipient notification + balance update
        io.to(`user-${recipient._id}`).emit('new-notification', {
          recipient: recipient._id,
          title: 'Money Received',
          message: `You received SSP ${amount} from ${sender.phone}`,
          type: 'transaction',
          relatedTransaction: transaction._id
        });

        io.to(`user-${recipient._id}`).emit('balance-updated', {
          userId: recipient._id,
          balance: recipient.balance
        });
      } else {
        console.error('IO instance not available for sendMoney emits');
      }
    } catch (err) {
      console.error('Socket emit failed for sendMoney:', err);
    }

    res.json({
      message: 'Money sent successfully',
      transaction: {
        _id: transaction._id,
        transactionId,
        amount,
        recipient: recipient.phone,
        status: 'completed'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const withdrawMoney = async (req, res) => {
  try {
    const { agentId } = req.body;
    const amount = parseFloat(req.body.amount);
    const user = await User.findById(req.userId);
    
    // Find agent by agentId field (6-digit string), not MongoDB _id
    const agent = await User.findOne({ agentId });

    if (!user || !agent) {
      return res.status(404).json({ message: 'User or agent not found' });
    }

    if (agent.role !== 'agent') {
      return res.status(400).json({ message: 'Invalid agent' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Try to get tiered withdrawal commission, fall back to flat commission
    let commissionPercent = 0;
    let companyCommissionPercent = 0;

    try {
      const tieredDoc = await TieredCommission.findOne({ type: 'send-money' });
      if (tieredDoc && tieredDoc.withdrawalTiers && tieredDoc.withdrawalTiers.length > 0) {
        // Find highest tier where minAmount <= amount
        const applicableTier = tieredDoc.withdrawalTiers
          .filter(t => t.minAmount <= amount)
          .sort((a, b) => b.minAmount - a.minAmount)[0];
        
        if (applicableTier) {
          commissionPercent = applicableTier.agentPercent || 0;
          companyCommissionPercent = applicableTier.companyPercent || 0;
        }
      }
    } catch (err) {
      console.error('Failed to fetch tiered commission for withdrawal:', err);
    }

    // Fall back to flat commission if no tiered config
    if (companyCommissionPercent === 0 && commissionPercent === 0) {
      const commissionDoc = await Commission.findOne();
      commissionPercent = commissionDoc?.percent || 0;
      companyCommissionPercent = commissionDoc?.withdrawPercent ?? commissionDoc?.percent ?? 0;
    }

    const commissionAmount = parseFloat(((amount * commissionPercent) / 100).toFixed(2)) || 0;
    const companyCommissionAmount = parseFloat(((amount * companyCommissionPercent) / 100).toFixed(2)) || 0;

    const transactionId = generateTransactionId();

    // Deduct from user (amount + company commission) and credit the agent
    const totalDebit = amount + companyCommissionAmount;
    if (user.balance < totalDebit) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= totalDebit;
    // Agent receives the withdrawn amount plus commission
    agent.balance = (agent.balance || 0) + amount + commissionAmount;

    console.log(`Withdrawal: User ${user._id} withdrawing ${amount} to Agent ${agent._id}`);
    console.log(`User balance before save: ${user.balance}`);
    console.log(`Agent balance before save: ${agent.balance}`);

    // Save both documents
    await user.save();
    await agent.save();

    console.log(`User saved with balance: ${user.balance}`);
    console.log(`Agent saved with balance: ${agent.balance}`);

    const transaction = new Transaction({
      transactionId,
      sender: req.userId,
      receiver: agent._id,
      amount,
      type: 'user_withdraw',
      // legacy commission fields
      commission: commissionAmount,
      commissionPercent,
      // new agent-specific commission fields (for UI and receipts)
      agentCommission: commissionAmount,
      agentCommissionPercent: commissionPercent,
      companyCommission: companyCommissionAmount,
      companyCommissionPercent: companyCommissionPercent,
      status: 'completed',
      senderBalance: user.balance,
      receiverBalance: agent.balance,
      senderLocation: user.currentLocation || null,
      receiverLocation: agent.currentLocation || null
    });

    await transaction.save();

    // Notifications
    const userNotif = new Notification({
      recipient: req.userId,
      title: 'Withdrawal Initiated',
      message: `Withdrawal of SSP ${amount} initiated. Meet agent ${agent.name}`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    const agentNotif = new Notification({
      recipient: agent._id,
      title: 'Withdrawal Request',
      message: `${user.name} requested withdrawal of SSP ${amount}`,
      type: 'transaction',
      relatedTransaction: transaction._id
    });

    await userNotif.save();
    await agentNotif.save();

    // Emit real-time events to both user and agent
    try {
      const io = getIO();
      if (io) {
        console.log(`Emitting balance-updated to user-${req.userId} with balance ${user.balance}`);
        console.log(`Emitting balance-updated to user-${agent._id} with balance ${agent.balance}`);

        // Notify user of withdrawal and update balance
        io.to(`user-${req.userId}`).emit('new-notification', {
          recipient: req.userId,
          title: userNotif.title,
          message: userNotif.message,
          type: userNotif.type,
          relatedTransaction: userNotif.relatedTransaction
        });

        io.to(`user-${req.userId}`).emit('balance-updated', {
          userId: req.userId,
          balance: user.balance
        });

        // Notify agent of withdrawal request and update balance
        io.to(`user-${agent._id}`).emit('new-notification', {
          recipient: agent._id,
          title: agentNotif.title,
          message: agentNotif.message,
          type: agentNotif.type,
          relatedTransaction: agentNotif.relatedTransaction
        });

        io.to(`user-${agent._id}`).emit('balance-updated', {
          userId: agent._id,
          balance: agent.balance
        });
      } else {
        console.error('IO instance not available');
      }
    } catch (err) {
      console.error('Socket emit failed:', err);
    }

    res.json({
      message: 'Withdrawal initiated',
      transaction: { _id: transaction._id, transactionId, amount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ sender: req.userId }, { receiver: req.userId }]
    })
      .populate('sender', 'name phone')
      .populate('receiver', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactionStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    
    // Calculate pending commissions from pending withdrawal requests
    const pendingCommissions = await WithdrawalRequest.aggregate([
      {
        $match: {
          agent: userId,
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          pendingAgentCommission: { $sum: { $ifNull: ['$agentCommission', 0] } },
          pendingCompanyCommission: { $sum: { $ifNull: ['$companyCommission', 0] } }
        }
      }
    ]);
    
    const pendingComm = pendingCommissions[0] || { pendingAgentCommission: 0, pendingCompanyCommission: 0 };
    
    const stats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSent: {
            $sum: {
              $cond: [{ $eq: ['$sender', userId] }, '$amount', 0]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [{ $eq: ['$receiver', userId] }, '$amount', 0]
            }
          },
          withdrawalsCompletedCount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'completed'] }, { $or: [ { $eq: ['$sender', userId] }, { $eq: ['$receiver', userId] } ] } ] },
                1,
                0
              ]
            }
          },
          withdrawalsCompletedAmount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'completed'] }, { $or: [ { $eq: ['$sender', userId] }, { $eq: ['$receiver', userId] } ] } ] },
                '$amount',
                0
              ]
            }
          }
          ,
          transfersCompletedCount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'transfer'] }, { $eq: ['$status', 'completed'] }, { $or: [ { $eq: ['$sender', userId] }, { $eq: ['$receiver', userId] } ] } ] },
                1,
                0
              ]
            }
          },
          transfersCompletedAmount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'transfer'] }, { $eq: ['$status', 'completed'] }, { $or: [ { $eq: ['$sender', userId] }, { $eq: ['$receiver', userId] } ] } ] },
                '$amount',
                0
              ]
            }
          },
          transfersSentCount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'transfer'] }, { $eq: ['$status', 'completed'] }, { $eq: ['$sender', userId] } ] },
                1,
                0
              ]
            }
          },
          transfersSentAmount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'transfer'] }, { $eq: ['$status', 'completed'] }, { $eq: ['$sender', userId] } ] },
                '$amount',
                0
              ]
            }
          },
          commissionEarned: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'user_withdraw'] }, { $eq: ['$status', 'completed'] }, { $eq: ['$receiver', userId] } ] },
                { $ifNull: ['$agentCommission', '$commission'] },
                0
              ]
            }
          },
          pullsReceivedAmount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'user_withdraw'] }, { $eq: ['$status', 'completed'] }, { $eq: ['$receiver', userId] } ] },
                '$amount',
                0
              ]
            }
          },
          transfersReceivedAmount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ['$type', 'transfer'] }, { $eq: ['$status', 'completed'] }, { $eq: ['$receiver', userId] } ] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalSent: 0,
      totalReceived: 0,
      withdrawalsCompletedCount: 0,
      withdrawalsCompletedAmount: 0,
      transfersCompletedCount: 0,
      transfersCompletedAmount: 0,
      transfersSentCount: 0,
      transfersSentAmount: 0,
      commissionEarned: 0,
      pullsReceivedAmount: 0,
      transfersReceivedAmount: 0
    };

    res.json({
      ...result,
      pendingAgentCommission: pendingComm.pendingAgentCommission || 0,
      pendingCompanyCommission: pendingComm.pendingCompanyCommission || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserInfo = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        fullName: user.name,
        phoneNumber: user.phone,
        balance: user.balance,
        email: user.email,
        userType: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
