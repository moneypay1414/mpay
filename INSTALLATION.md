# MoneyPay Installation Guide

## System Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **MongoDB**: v4.4 or higher (local or MongoDB Atlas)
- **Git**: For version control
- **Twilio Account**: For SMS functionality (optional but recommended)

## Step-by-Step Installation

### Step 1: Clone or Download the Project

```bash
# If using git
git clone https://github.com/yourusername/moneypay.git
cd moneypay

# Or extract the zip file and navigate to it
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory
```bash
cd backend
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Create Environment File
```bash
# Copy the example env file
cp ../.env.example .env

# Or create manually
touch .env
```

#### 2.4 Configure Environment Variables

Edit `backend/.env` with your settings:

```env
# ===== Database =====
MONGODB_URI=mongodb://localhost:27017/moneypay
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/moneypay

# ===== JWT Configuration =====
JWT_SECRET=your_super_secret_key_change_this_in_production

# ===== Server Configuration =====
PORT=5000
NODE_ENV=development

# ===== Twilio SMS Configuration =====
# Get these from https://www.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ===== Admin Account =====
ADMIN_EMAIL=admin@moneypay.com
ADMIN_PASSWORD=admin123

# ===== Frontend Configuration =====
FRONTEND_URL=http://localhost:5173

# ===== Application Configuration =====
CURRENCY=SSP
```

**How to get Twilio credentials:**
1. Sign up at https://www.twilio.com
2. Get your Account SID from Dashboard
3. Get your Auth Token from Dashboard
4. Buy a phone number or verify existing one
5. Add to .env file

#### 2.5 Start Backend Server

```bash
# Development mode (with nodemon auto-reload)
npm run dev

# OR production mode
npm start
```

You should see:
```
Server running on port 5000
MongoDB connected
```

### Step 3: Frontend Setup

#### 3.1 Open New Terminal and Navigate to Frontend
```bash
cd frontend
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Create Vite Configuration (if needed)

The `vite.config.js` is already configured, but verify it has:
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

#### 3.4 Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
press h to show help
```

### Step 4: Database Setup

#### Option A: Local MongoDB

**On Windows:**
```bash
# Install MongoDB Community Edition
# Then start MongoDB
mongod

# OR if installed as service
net start MongoDB
```

**On Mac:**
```bash
# Using Homebrew
brew install mongodb-community
brew services start mongodb-community
```

**On Linux:**
```bash
# Ubuntu/Debian
sudo systemctl start mongodb
sudo systemctl status mongodb
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get connection string
5. Add to `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/moneypay
```

### Step 5: First Login Test

1. Open browser to `http://localhost:5173`
2. You should see the MoneyPay login page
3. Click "Create Account"
4. Fill in the registration form
5. Use code from backend logs for verification (in development)
6. Login and explore!

**Admin Credentials:**
- Email: `admin@moneypay.com`
- Password: `admin123`

## Configuration Details

### MongoDB Collections

The following collections will be created automatically:

- `users` - User accounts with roles
- `transactions` - All transactions
- `notifications` - User notifications
- `verifications` - Phone verification codes

### JWT Configuration

The JWT token expires in 7 days by default. To change:

Edit `backend/utils/helpers.js`:
```javascript
export const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }  // Change this value
  );
};
```

### CORS Configuration

The backend allows requests from:
- `http://localhost:5173` (development)
- Configure for production in `backend/server.js`

## SSL/HTTPS Setup (Production)

For production, generate SSL certificates:

```bash
# Using OpenSSL
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Then update server.js to use HTTPS
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(PORT);
```

## Verification in Development

When testing SMS/Verification:
- Check the backend terminal logs
- Look for the verification code
- Use it in the frontend
- Or configure real Twilio account

## Build for Production

### Backend

```bash
cd backend

# No build needed, ready for deployment
# Deploy to Heroku, AWS, DigitalOcean, etc.
```

### Frontend

```bash
cd frontend

# Build production bundle
npm run build

# Output goes to 'dist' folder
# Deploy to Vercel, Netlify, AWS S3, etc.
```

## Deployment Guides

### Heroku Backend

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-moneypay-backend

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number

# Deploy
git push heroku main
```

### Vercel Frontend

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set VITE_API_URL to your backend URL
vercel env add VITE_API_URL https://your-backend.herokuapp.com
```

## Troubleshooting

### Issue: MongoDB Connection Failed

**Solution:**
- Check MongoDB is running: `mongod --version`
- Verify MONGODB_URI in .env
- For Atlas, check IP whitelist settings
- Check network connectivity

### Issue: Port Already in Use

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000

# Kill process and restart
```

### Issue: CORS Error in Console

**Solution:**
- Verify CORS is enabled in backend
- Check frontend URL matches CORS settings
- Clear browser cache

### Issue: SMS Not Sending

**Solution:**
- Verify Twilio credentials in .env
- Check Twilio account has balance
- Verify phone number format
- Check backend logs for errors

### Issue: Build Error

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear npm cache
npm cache clean --force

# Try building again
npm run build
```

## Environment Checklist

- [ ] Node.js v16+ installed
- [ ] npm v7+ installed
- [ ] MongoDB installed or Atlas account created
- [ ] Backend .env file created with all variables
- [ ] Backend runs without errors
- [ ] Frontend runs without errors
- [ ] Can access http://localhost:5173
- [ ] Can login with admin credentials
- [ ] Can register new user
- [ ] Notifications working

## Next Steps

1. **Customize**: Update colors, logo, and branding
2. **Test**: Create test transactions
3. **Security**: Change admin password
4. **Backup**: Setup MongoDB backups
5. **Monitor**: Setup error tracking
6. **Deploy**: Push to production

## Support & Resources

- **Documentation**: See README.md
- **API Docs**: See QUICKSTART.md
- **Issues**: Check troubleshooting section
- **Twilio Docs**: https://www.twilio.com/docs
- **MongoDB Docs**: https://docs.mongodb.com

---

**You're all set! 🎉 Happy developing!** 💰
