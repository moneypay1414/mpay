import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendSMS } from '../utils/sms.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendNotificationToAll = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    const users = await User.find();

    const notifications = users.map(user => ({
      recipient: user._id,
      title,
      message,
      type: type || 'system'
    }));

    await Notification.insertMany(notifications);

    // Send SMS to all users
    try {
      for (const user of users) {
        await sendSMS(user.phone, `MoneyPay: ${message}`);
      }
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({ message: `Notification sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = new Notification({
      recipient: userId,
      title,
      message,
      type: type || 'system'
    });

    await notification.save();

    try {
      await sendSMS(user.phone, `MoneyPay: ${message}`);
    } catch (error) {
      console.error('SMS failed:', error);
    }

    res.json({ message: 'Notification sent', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.findByIdAndDelete(notificationId);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
