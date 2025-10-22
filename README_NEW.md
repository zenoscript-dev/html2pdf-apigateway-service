# HTML2PDF Gateway Service - Complete Production Backend

A **production-grade NestJS API Gateway** with authentication, authorization, API key management, flexible plans, quota enforcement, and comprehensive analytics for the HTML to PDF converter architecture.

---

## 🚀 **Features Overview**

### **✅ Core Features**
- ✅ **Secure Authentication** - Argon2d password hashing with salt & pepper
- ✅ **JWT Sessions** - Access tokens (15min) + Refresh tokens (7 days)
- ✅ **Email Verification** - Nodemailer with beautiful HTML templates
- ✅ **Password Reset** - Secure token-based flow
- ✅ **API Key Management** - Prefix-based keys (`pdf_live_xxx`, `pdf_test_xxx`)
- ✅ **Flexible Plans** - Free, Basic, Pro, Enterprise (fully configurable)
- ✅ **Quota Enforcement** - Redis-based daily/monthly rate limiting
- ✅ **Usage Analytics** - Detailed tracking with permanent retention
- ✅ **PDF Proxy** - Routes to backend with validation & quota checks
- ✅ **Admin Dashboard APIs** - User management & system analytics
- ✅ **Health & Metrics** - Prometheus integration

---

## 📋 **Table of Contents**

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [API Documentation](#api-documentation)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Security Features](#security-features)
7. [Rate Limiting & Quotas](#rate-limiting--quotas)
8. [Deployment](#deployment)

---

## 💻 **Installation**

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Set up MySQL database
# Create database: html2pdf_gateway

# 4. Set up Redis (for rate limiting)
# Install and start Redis on localhost:6379

# 5. Run in development
npm run start:dev

# 6. Run in production
npm run build
npm run start:prod
```

---

## ⚙️ **Configuration**

### **Required Services**
- **MySQL 8.0+** - User data, plans, API keys, usage tracking
- **Redis 6.0+** - Rate limiting, quota counters
- **SMTP Server** - Mailtrap (dev) or production email service

### **Environment Variables**

See [.env.example](./.env.example) for the complete list. Key variables:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=html2pdf_gateway

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Password Security
PASSWORD_PEPPER=your-super-secret-pepper-value

# Email (Mailtrap for dev)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password

# PDF Service
PDF_SERVICE_URL=http://localhost:5000

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 📚 **API Documentation**

API documentation is available at: `http://localhost:6100/api` (Swagger UI)

### **Base URL**
```
http://localhost:6100/api/v1
```

---

### **🔐 Authentication Endpoints**

#### **POST /auth/signup**
Register a new user
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### **POST /auth/login**
Login and get tokens
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
**Response:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "plan": { "id": "uuid", "name": "Free" }
  }
}
```

#### **POST /auth/refresh**
Refresh access token
```json
{
  "refreshToken": "eyJhbG..."
}
```

#### **POST /auth/verify-email**
Verify email with token
```json
{
  "token": "abc123..."
}
```

#### **POST /auth/forgot-password**
Request password reset
```json
{
  "email": "user@example.com"
}
```

#### **POST /auth/reset-password**
Reset password with token
```json
{
  "token": "abc123...",
  "newPassword": "NewSecurePassword123!"
}
```

---

### **🔑 API Keys Endpoints**

**Authentication:** Bearer token (JWT)

#### **POST /api-keys**
Create a new API key
```json
{
  "name": "My Production Key",
  "type": "live"  // "live" or "test"
}
```
**Response:**
```json
{
  "message": "API key created successfully...",
  "apiKey": "pdf_live_abc123...",
  "keyPrefix": "pdf_live_...xyz",
  "type": "live",
  "warning": "⚠️ Save this key now! ..."
}
```

#### **GET /api-keys**
Get all your API keys

#### **GET /api-keys/statistics**
Get API key usage statistics

#### **PATCH /api-keys/:id**
Update API key (name, active status)

#### **DELETE /api-keys/:id**
Delete an API key

---

### **📄 PDF Generation Endpoints**

**Authentication:** API Key in `X-API-Key` header

#### **POST /pdf/generate**
Generate PDF from HTML
```json
{
  "html": "<html><body><h1>Hello World</h1></body></html>",
  "options": {
    "format": "A4",
    "margin": { "top": "1cm", "bottom": "1cm" }
  }
}
```
**Response:** PDF file (application/pdf)

#### **POST /pdf/generate-from-url**
Generate PDF from URL
```json
{
  "url": "https://example.com",
  "options": { "format": "A4" }
}
```
**Response:** PDF file (application/pdf)

#### **GET /pdf/quota**
Check your current quota status
**Response:**
```json
{
  "plan": {
    "name": "Pro",
    "dailyLimit": 10000,
    "monthlyLimit": 300000
  },
  "usage": {
    "dailyUsed": 145,
    "monthlyUsed": 2340,
    "remainingDaily": 9855,
    "remainingMonthly": 297660
  },
  "percentages": {
    "dailyPercentage": 1.45,
    "monthlyPercentage": 0.78
  }
}
```

---

### **💳 Plans Endpoints**

#### **GET /plans**
Get all active plans (public)

#### **GET /plans/:id**
Get plan details (public)

#### **POST /plans/upgrade/:planId**
Upgrade to a new plan (requires auth)

**Admin Only:**
- `POST /plans` - Create plan
- `PATCH /plans/:id` - Update plan
- `DELETE /plans/:id` - Delete plan
- `POST /plans/:id/activate` - Activate plan
- `POST /plans/:id/deactivate` - Deactivate plan

---

### **📊 Usage & Analytics Endpoints**

**Authentication:** Bearer token (JWT)

#### **GET /usage**
Get your usage history
Query params: `startDate`, `endDate`

#### **GET /usage/statistics**
Get your usage statistics

#### **GET /usage/api-key/:apiKeyId**
Get usage for specific API key

---

### **👨‍💼 Admin Endpoints**

**Authentication:** Bearer token (JWT) with Admin role

#### **User Management**
- `GET /admin/users` - Get all users (paginated)
- `GET /admin/users/:userId` - Get user details
- `PATCH /admin/users/:userId/activate` - Activate user
- `PATCH /admin/users/:userId/deactivate` - Deactivate user
- `PATCH /admin/users/:userId/plan/:planId` - Change user plan
- `PATCH /admin/users/:userId/promote` - Promote to admin
- `PATCH /admin/users/:userId/demote` - Demote from admin
- `DELETE /admin/users/:userId` - Delete user

#### **System Analytics**
- `GET /admin/analytics/overview` - System overview
- `GET /admin/analytics/statistics` - Detailed statistics
- `GET /admin/analytics/user-growth` - User growth over time
- `GET /admin/analytics/plan-distribution` - Plan distribution

#### **Bulk Operations**
- `POST /admin/bulk/deactivate` - Bulk deactivate users
- `POST /admin/bulk/change-plan` - Bulk change plans

---

## 🏗️ **Architecture**

### **Service Layers**

```
┌─────────────────────────────────────────────┐
│           API Gateway (Port 6100)            │
│  Authentication, Authorization, Rate Limit   │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐    ┌──────────────────┐
│  PDF Backend  │    │  Other Services  │
│  (Port 5000)  │    │   (Future)       │
└───────────────┘    └──────────────────┘

┌─────────────┐      ┌─────────────┐
│   MySQL     │      │    Redis    │
│  Database   │      │Rate Limiting│
└─────────────┘      └─────────────┘
```

### **Module Structure**

1. **ConfigModule** - Environment configuration
2. **DatabaseModule** - TypeORM + MySQL
3. **RedisModule** - Redis connection
4. **EmailModule** - Nodemailer + templates
5. **AuthModule** - Signup, login, verification, password reset
6. **PlansModule** - Flexible plan management
7. **ApiKeysModule** - API key generation & validation
8. **QuotaModule** - Rate limiting & quota enforcement
9. **UsageModule** - Usage tracking & analytics
10. **PdfProxyModule** - Proxy to PDF service
11. **AdminModule** - User & system management
12. **HealthModule** - Health checks & Prometheus metrics

---

## 🗄️ **Database Schema**

### **Tables**

- **users** - User accounts
- **plans** - Subscription plans
- **api_keys** - API keys (hashed)
- **usage** - Request tracking (permanent)
- **refresh_tokens** - JWT refresh tokens
- **email_verifications** - Email verification tokens
- **password_resets** - Password reset tokens

### **Key Relationships**

- User → Plan (Many-to-One)
- User → ApiKeys (One-to-Many)
- User → Usage (One-to-Many)
- ApiKey → Usage (One-to-Many)

---

## 🔒 **Security Features**

### **Password Security**
- **Argon2d** hashing algorithm
- **Per-user salt** (16 bytes random)
- **Global pepper** (environment secret)
- **Configurable parameters** (64MB memory, 3 iterations)

### **API Key Security**
- **Hashed storage** (SHA-256)
- **Prefix-based format** (`pdf_live_xxx`)
- **Last 8 chars shown** for identification
- **Never expires** (configurable)
- **Multiple keys per user**
- **Sandbox keys** don't count toward quota

### **JWT Security**
- **Short-lived access tokens** (15 minutes)
- **Long-lived refresh tokens** (7 days)
- **Token rotation** on refresh
- **Automatic revocation** on password reset

### **Additional Security**
- **CORS protection** (configurable origins)
- **Helmet.js** security headers
- **Request compression** (gzip)
- **Rate limiting** (multiple tiers)
- **Input validation** (class-validator)

---

## 🚦 **Rate Limiting & Quotas**

### **Global Rate Limits** (NestJS Throttler)
- **Short**: 2 requests/second
- **Medium**: 10 requests/minute
- **Long**: 100 requests/hour

### **Plan-Based Quotas** (Redis + Database)
- **Daily limits** (configurable per plan)
- **Monthly limits** (configurable per plan)
- **File size limits** (configurable per plan)
- **Page limits** (configurable per plan)
- **Concurrent job limits** (configurable per plan)

### **Quota Enforcement**
1. Check quota before processing
2. Increment counter on success
3. Track usage in database
4. Return 400 if quota exceeded

### **Test/Sandbox Keys**
- **Don't count toward quotas**
- **For development/testing**
- **Can be disabled per plan**

---

## 🎨 **Default Plans**

| Plan | Price | Daily | Monthly | File Size | Pages | Jobs | Features |
|------|-------|-------|---------|-----------|-------|------|----------|
| **Free** | $0 | 100 | 3,000 | 5 MB | 10 | 1 | API access, Sandbox |
| **Basic** | $10/mo | 1,000 | 30,000 | 25 MB | 100 | 3 | + Webhooks |
| **Pro** | $50/mo | 10,000 | 300,000 | 100 MB | 500 | 10 | + Priority, Custom watermark |
| **Enterprise** | $200/mo | Unlimited | Unlimited | 500 MB | Unlimited | 50 | All features |

**Plans are fully configurable** - add/edit/remove without code changes!

---

## 🚀 **Deployment**

### **Production Checklist**

- [ ] Set `NODE_ENV=production`
- [ ] Set `DB_SYNCHRONIZE=false` (use migrations)
- [ ] Use production SMTP (not Mailtrap)
- [ ] Set restrictive `CORS_ORIGIN`
- [ ] Change all secrets (`JWT_SECRET`, `PASSWORD_PEPPER`, etc.)
- [ ] Set up MySQL backups
- [ ] Set up Redis persistence
- [ ] Enable HTTPS
- [ ] Set up Prometheus monitoring
- [ ] Configure log aggregation

### **Docker Deployment**

```yaml
version: '3.8'
services:
  gateway:
    build: .
    ports:
      - "6100:6100"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: html2pdf_gateway
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
```

---

## 📖 **Usage Examples**

### **1. User Registration Flow**

```bash
# 1. Sign up
curl -X POST http://localhost:6100/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# 2. Verify email (check email for token)
curl -X POST http://localhost:6100/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123..."}'

# 3. Login
curl -X POST http://localhost:6100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

### **2. Generate API Key**

```bash
# Create API key
curl -X POST http://localhost:6100/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Key","type":"live"}'

# Response: Save the apiKey value!
```

### **3. Generate PDF**

```bash
# Generate PDF from HTML
curl -X POST http://localhost:6100/api/v1/pdf/generate \
  -H "X-API-Key: pdf_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"html":"<html><body><h1>Hello</h1></body></html>"}' \
  --output document.pdf
```

### **4. Check Quota**

```bash
# Check remaining quota
curl -X GET http://localhost:6100/api/v1/pdf/quota \
  -H "X-API-Key: pdf_live_abc123..."
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 **License**

ISC

---

## 🆘 **Support**

For issues and questions:
- Open an issue on GitHub
- Check the [API Documentation](http://localhost:6100/api)
- Review [.env.example](./.env.example) for configuration

---

**Built with ❤️ using NestJS, TypeORM, MySQL, Redis, and Argon2**

