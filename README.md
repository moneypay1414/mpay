# MoneyPay - Digital Money Transfer Platform

A comprehensive web-based digital money transfer solution built with **React**, **Vite**, **Node.js**, **Express**, and **MongoDB**. MoneyPay supports three user roles: Users, Agents, and Admins, with features like real-time notifications, SMS verification, QR code transfers, and complete transaction monitoring.

## 🌟 Features

### User Features
- ✅ **User Authentication** - Registration with phone verification, secure login
- ✅ **Send Money** - Transfer money by phone number or QR code scan
- ✅ **Withdraw Cash** - Request withdrawals through agents
- ✅ **Transaction History** - View all transactions with filters
- ✅ **Real-time Notifications** - Get instant updates via notifications and SMS
- ✅ **Dashboard** - Beautiful dashboard with balance, charts, and stats
- ✅ **Profile Management** - Update profile and manage account

### Agent Features
- ✅ **Deposit Money** - Deposit money to user accounts
- ✅ **Process Withdrawals** - Handle user withdrawal requests
- ✅ **Transaction Management** - View and manage agent transactions
- ✅ **Agent Dashboard** - Real-time monitoring of activities

### Admin Features
- ✅ **User Management** - View all users, suspend/unsuspend accounts
- ✅ **Topup & Withdraw** - Manually topup or withdraw from user accounts
- ✅ **Transaction Monitoring** - Monitor all system transactions
- ✅ **Bulk Notifications** - Send notifications to all users or individuals
- ✅ **Analytics Dashboard** - Charts and reports with system statistics
- ✅ **User Suspension** - Suspend and unsuspend users
- ✅ **SMS Integration** - Send SMS notifications
- ✅ **Account Management** - Full system control

### Technical Features
- ✅ **Real-time Updates** - Socket.io for live notifications
- ✅ **Phone Verification** - SMS-based verification with Twilio
- ✅ **QR Code** - QR code generation and scanning
- ✅ **Charts & Analytics** - Chart.js for visual data representation
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Secure Authentication** - JWT-based authentication
- ✅ **Currency** - SSP (South Sudanese Pound)

## 📁 Project Structure

```
mpay/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Notification.js
│   │   └── Verification.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── transactionController.js
│   │   ├── adminController.js
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── adminRoutes.js
│   │   └── notificationRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── sms.js
│   │   └── qrcode.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UserLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── SendMoney.jsx
│   │   │   ├── Withdraw.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminTransactions.jsx
│   │   │   └── AdminNotifications.jsx
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── auth.css
│   │   │   ├── layout.css
│   │   │   ├── dashboard.css
│   │   │   ├── send-money.css
│   │   │   ├── withdraw.css
│   │   │   ├── transactions.css
│   │   │   ├── notifications.css
│   │   │   ├── admin-layout.css
│   │   │   ├── admin-dashboard.css
│   │   │   ├── admin-users.css
│   │   │   ├── admin-transactions.css
│   │   │   └── admin-notifications.css
│   │   ├── context/
│   │   │   └── store.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── package.json
│   └── index.html
└── .env.example
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MongoDB (local or cloud)
- Twilio account (for SMS features)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your configuration
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: A secure secret key
# - TWILIO_ACCOUNT_SID: Your Twilio SID
# - TWILIO_AUTH_TOKEN: Your Twilio auth token
# - TWILIO_PHONE_NUMBER: Your Twilio phone number

# Start backend server
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📝 Environment Variables

Create a `.env` file in the backend directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/moneypay

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=5000
NODE_ENV=development

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Admin
ADMIN_EMAIL=admin@moneypay.com
ADMIN_PASSWORD=admin123

# Frontend
FRONTEND_URL=http://localhost:5173

# Currency
CURRENCY=SSP
```

## 🔑 Default Credentials

**Admin Account:**
- Email: `admin@moneypay.com`
- Password: `admin123`

**Test User:**
- Email: `user@example.com`
- Password: `user123`
- Phone: `+211912345678`

## 🛣️ API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-phone` - Verify phone number
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Transactions
- `POST /api/transactions/send-money` - Send money to another user
- `POST /api/transactions/withdraw` - Initiate withdrawal
- `GET /api/transactions/transactions` - Get user transactions
- `GET /api/transactions/stats` - Get transaction statistics

### Admin
- `POST /api/admin/topup-user` - Topup user account
- `POST /api/admin/withdraw-from-user` - Withdraw from user account
- `GET /api/admin/users` - Get all users
- `GET /api/admin/transactions` - Get all transactions
- `POST /api/admin/suspend-user` - Suspend user
- `POST /api/admin/unsuspend-user` - Unsuspend user
- `GET /api/admin/stats` - Get admin statistics

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-as-read` - Mark notification as read
- `POST /api/notifications/mark-all-as-read` - Mark all as read
- `POST /api/notifications/send-to-all` - Send to all users (Admin)
- `POST /api/notifications/send-to-user` - Send to specific user (Admin)
- `DELETE /api/notifications/:id` - Delete notification

## 🎨 User Interface

### Color Scheme
- **Primary**: `#2563eb` (Blue)
- **Secondary**: `#10b981` (Green)
- **Danger**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Amber)
- **Dark**: `#1f2937` (Dark Gray)
- **Light**: `#f3f4f6` (Light Gray)

### Key Pages

1. **Authentication**
   - Login page with email/password
   - Registration with phone verification
   - SMS verification code entry

2. **User Dashboard**
   - Balance overview
   - Transaction statistics
   - Charts for sent/received amounts
   - Quick action buttons

3. **Send Money**
   - Transfer by phone number
   - QR code scanning
   - Transaction confirmation

4. **Transactions**
   - Transaction history with filtering
   - Transaction details
   - Status indicators

5. **Admin Dashboard**
   - System-wide statistics
   - User distribution charts
   - Transaction status overview
   - Quick management actions

6. **User Management**
   - List of all users
   - User suspension/unsuspension
   - Manual topup/withdrawal
   - User role filtering

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Desktop**: Full layout
- **Tablet**: Adjusted grid layout
- **Mobile**: Single column layout, hamburger menu

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Role-based Access Control**: Separate dashboards for users, agents, and admins
- **Phone Verification**: SMS-based verification for accounts
- **CORS Protection**: Configured CORS for API security
- **Environment Variables**: Sensitive data stored in .env

## 💾 Database Schema

### User Collection
```javascript
{
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  balance: Number,
  role: String (user/agent/admin),
  isVerified: Boolean,
  isSuspended: Boolean,
  profileImage: String,
  idNumber: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Collection
```javascript
{
  transactionId: String (unique),
  sender: ObjectId (User ref),
  receiver: ObjectId (User ref),
  amount: Number,
  type: String (transfer/topup/withdrawal/agent_deposit),
  status: String (pending/completed/failed/cancelled),
  description: String,
  senderBalance: Number,
  receiverBalance: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 📊 Charts Used

- **Line Chart**: Transaction history
- **Bar Chart**: Transaction types
- **Pie Chart**: User distribution
- **Doughnut Chart**: Transaction breakdown

## 🔔 Notification System

- **In-app Notifications**: Real-time updates via Socket.io
- **SMS Notifications**: Twilio integration for SMS alerts
- **Notification Types**: Transaction, System, Alert, Offer
- **Notification Filtering**: Unread/read filtering

## 🚀 Deployment

### Backend Deployment (Heroku)
```bash
cd backend
git init
heroku login
heroku create your-app-name
git push heroku main
```

### Frontend Deployment (Vercel)
```bash
cd frontend
npm install -g vercel
vercel
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@moneypay.com or open an issue in the repository.

## 🙏 Acknowledgments

- **Vite** for fast build tooling
- **React** for UI library
- **Express.js** for backend framework
- **MongoDB** for database
- **Twilio** for SMS services
- **Socket.io** for real-time communication
- **Chart.js** for data visualization

---

**MoneyPay** - Making Money Transfer Simple, Secure, and Social 💰
