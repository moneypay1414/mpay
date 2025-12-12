# MoneyPay API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

---

## 🔐 Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+211912345678",
  "password": "securepassword",
  "role": "user"  // "user" or "agent"
}

Response:
{
  "message": "User registered. Please verify your phone number.",
  "userId": "user_id",
  "phone": "+211912345678"
}
```

### Verify Phone
```
POST /auth/verify-phone
Content-Type: application/json

{
  "phone": "+211912345678",
  "code": "123456"
}

Response:
{
  "message": "Phone verified successfully"
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+211912345678",
    "role": "user",
    "balance": 5000,
    "isVerified": true
  }
}
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer <token>

Response:
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+211912345678",
  "balance": 5000,
  "role": "user",
  "isVerified": true,
  "isSuspended": false,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Update Profile
```
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "profileImage": "base64_image_data",
  "idNumber": "ID123456"
}

Response:
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "profileImage": "url_to_image"
}
```

---

## 💳 Transaction Endpoints

### Send Money
```
POST /transactions/send-money
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientPhone": "+211987654321",
  "amount": 1000,
  "description": "Payment for service"
}

Response:
{
  "message": "Money sent successfully",
  "transaction": {
    "_id": "transaction_id",
    "transactionId": "TXN202401001",
    "amount": 1000,
    "recipient": "+211987654321",
    "status": "completed"
  }
}

Error Cases:
- 400: "Insufficient balance"
- 404: "Recipient not found"
```

### Withdraw Money
```
POST /transactions/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": "agent_user_id",
  "amount": 5000
}

Response:
{
  "message": "Withdrawal initiated",
  "transaction": {
    "_id": "transaction_id",
    "transactionId": "TXN202401002",
    "amount": 5000
  }
}

Error Cases:
- 400: "Insufficient balance"
- 404: "Agent not found"
```

### Get Transactions
```
GET /transactions/transactions
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 50)
- offset: number (default: 0)
- status: "completed" | "pending" | "failed"

Response:
{
  "transactions": [
    {
      "_id": "id",
      "transactionId": "TXN202401001",
      "sender": { "name": "John", "phone": "+211..." },
      "receiver": { "name": "Jane", "phone": "+211..." },
      "amount": 1000,
      "type": "transfer",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50
}
```

### Get Transaction Stats
```
GET /transactions/stats
Authorization: Bearer <token>

Response:
{
  "totalTransactions": 25,
  "totalSent": 15000,
  "totalReceived": 8000
}
```

---

## 🔐 Admin Endpoints

All admin endpoints require `Authorization: Bearer <token>` and admin role.

### Topup User Account
```
POST /admin/topup-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 10000,
  "description": "Admin topup"
}

Response:
{
  "message": "Topup successful",
  "transaction": {
    "_id": "id",
    "transactionId": "TXN202401003",
    "amount": 10000
  }
}
```

### Withdraw from User
```
POST /admin/withdraw-from-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 5000,
  "description": "Admin withdrawal"
}

Response:
{
  "message": "Withdrawal successful",
  "transaction": {
    "_id": "id",
    "transactionId": "TXN202401004",
    "amount": 5000
  }
}
```

### Get All Users
```
GET /admin/users
Authorization: Bearer <admin_token>

Query Parameters:
- role: "user" | "agent" | "admin"
- suspended: true | false
- limit: number
- offset: number

Response:
{
  "users": [
    {
      "_id": "id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+211912345678",
      "role": "user",
      "balance": 5000,
      "isVerified": true,
      "isSuspended": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 100
}
```

### Get All Transactions
```
GET /admin/transactions
Authorization: Bearer <admin_token>

Query Parameters:
- status: "completed" | "pending" | "failed"
- type: "transfer" | "topup" | "withdrawal"
- startDate: "2024-01-01"
- endDate: "2024-01-31"
- limit: number
- offset: number

Response:
{
  "transactions": [
    {
      "_id": "id",
      "transactionId": "TXN202401001",
      "sender": { "phone": "+211...", "role": "user" },
      "receiver": { "phone": "+211...", "role": "user" },
      "amount": 1000,
      "type": "transfer",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 500
}
```

### Suspend User
```
POST /admin/suspend-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id"
}

Response:
{
  "message": "User suspended",
  "user": {
    "_id": "id",
    "isSuspended": true
  }
}
```

### Unsuspend User
```
POST /admin/unsuspend-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id"
}

Response:
{
  "message": "User unsuspended",
  "user": {
    "_id": "id",
    "isSuspended": false
  }
}
```

### Get Admin Stats
```
GET /admin/stats
Authorization: Bearer <admin_token>

Response:
{
  "totalUsers": 250,
  "totalTransactions": 1500,
  "totalVolume": 5000000,
  "completedTransactions": 1450,
  "pendingTransactions": 50,
  "usersByRole": [
    { "_id": "user", "count": 200 },
    { "_id": "agent", "count": 40 },
    { "_id": "admin", "count": 10 }
  ]
}
```

---

## 🔔 Notification Endpoints

### Get Notifications
```
GET /notifications
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 50)
- skip: number (default: 0)

Response:
{
  "notifications": [
    {
      "_id": "id",
      "title": "Money Received",
      "message": "You received SSP 1000 from John",
      "type": "transaction",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Mark as Read
```
POST /notifications/mark-as-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationId": "notification_id"
}

Response:
{
  "_id": "id",
  "isRead": true
}
```

### Mark All as Read
```
POST /notifications/mark-all-as-read
Authorization: Bearer <token>

Response:
{
  "message": "All notifications marked as read"
}
```

### Send to All Users (Admin Only)
```
POST /notifications/send-to-all
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "System will be down for maintenance tonight",
  "type": "system"  // "system" | "alert" | "offer"
}

Response:
{
  "message": "Notification sent to 250 users"
}
```

### Send to Specific User (Admin Only)
```
POST /notifications/send-to-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "title": "Account Warning",
  "message": "Unusual activity detected on your account",
  "type": "alert"
}

Response:
{
  "message": "Notification sent",
  "notification": { ... }
}
```

### Delete Notification
```
DELETE /notifications/:notificationId
Authorization: Bearer <token>

Response:
{
  "message": "Notification deleted"
}
```

---

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Token invalid/expired |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

---

## 🔍 Error Codes

| Error | Meaning |
|-------|---------|
| INVALID_CREDENTIALS | Email or password incorrect |
| USER_EXISTS | Email or phone already registered |
| INSUFFICIENT_BALANCE | Not enough funds |
| INVALID_TOKEN | Token invalid or expired |
| ACCESS_DENIED | Admin only endpoint |
| RECIPIENT_NOT_FOUND | Phone number not found |
| INVALID_AMOUNT | Amount is invalid |

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+211912345678",
    "password": "password123",
    "role": "user"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Send Money
```bash
curl -X POST http://localhost:5000/api/transactions/send-money \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "recipientPhone": "+211987654321",
    "amount": 1000,
    "description": "Payment"
  }'
```

---

## 📝 Rate Limiting

To prevent abuse, implement rate limiting:

```javascript
// Add to your Express app
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Never expose JWT secrets** in logs or code
3. **Validate all inputs** on the backend
4. **Use CORS** properly configured
5. **Implement rate limiting** to prevent abuse
6. **Hash passwords** with bcrypt
7. **Use environment variables** for sensitive data
8. **Log all admin actions** for auditing
9. **Implement 2FA** for admin accounts
10. **Regular security audits** and penetration testing

---

## 📞 API Support

For API issues or questions:
- Check the logs for error messages
- Review request/response format
- Verify authentication token validity
- Ensure all required fields are provided
- Contact support: support@moneypay.com

---

**API Documentation v1.0** - Last Updated: January 2024 ✅
