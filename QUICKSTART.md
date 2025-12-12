# MoneyPay - Quick Start Guide

## 🎯 Getting Started in 5 Minutes

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 2. Setup Environment

Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/moneypay
JWT_SECRET=your_secret_key_123
PORT=5000
NODE_ENV=development
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
ADMIN_EMAIL=admin@moneypay.com
ADMIN_PASSWORD=admin123
FRONTEND_URL=http://localhost:5173
CURRENCY=SSP
```

### 3. Start MongoDB

```bash
# If installed locally
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App starts at http://localhost:5173
```

### 5. Login

Navigate to `http://localhost:5173`

**Admin Login:**
- Email: `admin@moneypay.com`
- Password: `admin123`
- Role: Admin Dashboard

**User Registration:**
- Click "Create Account"
- Enter your details
- Verify with code (check console/backend logs)
- Login and use the dashboard

## 🎨 User Roles

### 👤 User
- Send money to other users
- Withdraw cash through agents
- View transaction history
- Get notifications
- See balance and charts

### 🏪 Agent
- Deposit money to user accounts
- Process user withdrawals
- View agent transactions
- Manage cash float

### 🔐 Admin
- View all users
- Monitor all transactions
- Send notifications to users
- Suspend/unsuspend accounts
- Manual topup/withdrawal
- View analytics and charts

## 📱 Main Features Quick Reference

| Feature | User | Agent | Admin |
|---------|------|-------|-------|
| Send Money | ✅ | ✅ | ✅ |
| Withdraw | ✅ | ✅ | ✅ |
| View Transactions | ✅ | ✅ | ✅ |
| Receive Notifications | ✅ | ✅ | ✅ |
| Topup Account | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Send Notifications | ❌ | ❌ | ✅ |
| Suspend Users | ❌ | ❌ | ✅ |
| View Analytics | ❌ | ❌ | ✅ |

## 🔌 API Endpoints Quick Reference

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-phone
GET /api/auth/profile
PUT /api/auth/profile
```

### Transactions
```
POST /api/transactions/send-money
POST /api/transactions/withdraw
GET /api/transactions/transactions
GET /api/transactions/stats
```

### Admin Only
```
GET /api/admin/users
GET /api/admin/transactions
POST /api/admin/topup-user
POST /api/admin/suspend-user
GET /api/admin/stats
```

### Notifications
```
GET /api/notifications
POST /api/notifications/send-to-all
POST /api/notifications/send-to-user
```

## 💡 Testing Scenarios

### Scenario 1: Send Money
1. Login as User 1
2. Go to "Send Money"
3. Enter User 2's phone number
4. Enter amount and send
5. Both users see notifications

### Scenario 2: Admin Topup
1. Login as Admin
2. Go to "Users"
3. Click "Topup" on a user
4. Enter amount
5. User gets notification with SMS

### Scenario 3: Withdraw Request
1. Login as User
2. Go to "Withdraw"
3. Select agent
4. Enter amount
5. Agent gets notification to complete withdrawal

## ⚙️ Configuration

### Twilio Setup (SMS)
1. Get account at https://www.twilio.com
2. Get your SID and Auth Token
3. Get a phone number for sending SMS
4. Add to `.env`
5. SMS will work for registration and notifications

### MongoDB Setup
- Local: Default `mongodb://localhost:27017/moneypay`
- Cloud: Get URI from MongoDB Atlas and update `.env`

## 📝 Notes

- All amounts are in SSP (South Sudanese Pound)
- SMS features require Twilio configuration
- Real-time notifications use Socket.io
- QR codes for quick transfers
- Phone verification on registration
- Admin dashboard has full system analytics

## 🐛 Troubleshooting

**Port Already in Use:**
```bash
# Backend on different port
PORT=5001 npm run dev

# Frontend on different port
npm run dev -- --port 5174
```

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify credentials if using Atlas

**SMS Not Working:**
- Check Twilio credentials
- Verify phone number format
- Check Twilio account balance

**CORS Error:**
- Backend CORS should allow frontend URL
- Check vite.config.js proxy settings

## 🚀 Next Steps

1. **Customize**: Update colors, text, and branding
2. **Deploy**: Push to Heroku (backend) and Vercel (frontend)
3. **Scale**: Add more features like loans, savings, etc.
4. **Monitor**: Set up error tracking and analytics
5. **Secure**: Add 2FA, encryption, and audit logs

## 📞 Support

- Check logs: `npm run dev` shows all errors
- API errors shown in browser console
- Backend errors in terminal
- Database errors in MongoDB logs

---

Happy coding! 🎉 MoneyPay is ready to go! 💰
