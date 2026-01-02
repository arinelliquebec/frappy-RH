# 🚀 FrappYOU - Professional HR System with AI

> **Complete Human Resources Management Platform** with integrated artificial intelligence
> **Stack**: Go (Fiber) + Next.js + Azure OpenAI + SQL Server

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Frappy AI](#frappy-ai)
- [API](#api)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

FrappYOU is a complete and modern HR system that combines traditional human resources management with advanced artificial intelligence. Designed for medium and large companies, it offers automation, analytics, and an exceptional user experience.

### Problem Solved

Companies face challenges in HR management:
- ❌ Manual and slow processes
- ❌ Data scattered across multiple systems
- ❌ Lack of real-time analytics
- ❌ Poor employee experience
- ❌ High operational costs

### FrappYOU Solution

- ✅ **Complete Automation** - Vacation, attendance, payroll
- ✅ **Integrated AI** - 24/7 virtual assistant
- ✅ **Advanced Analytics** - Real-time dashboards and reports
- ✅ **Modern Experience** - Intuitive and mobile-first UI
- ✅ **Scalable** - Grows with your company

---

## ✨ Features

### 🏖️ Vacation Management

- Real-time vacation balance
- Online request and approval
- Shared team calendar
- Vacation selling (optional)
- Automatic notifications
- Complete history

### ⏰ Time Tracking

- Web/mobile clock-in
- Automatic hour bank
- Absence justifications
- Monthly reports
- Geolocation (optional)
- Payroll integration

### 💰 Payroll

- Automatic INSS/IRRF calculation
- PDF generation
- Complete history
- Year-to-date earnings (YTD)
- Accounting export
- Tax compliance

### 🎓 E-Learning

- Integrated course platform
- Interactive videos and quizzes
- Progress tracking
- Automatic certificates
- Personalized recommendations
- Ratings and feedback

### 📊 Analytics & Reports

- Executive dashboard
- HR analytics
- Engagement metrics
- Team performance
- Customizable reports
- Data export

### 🤖 Frappy AI - Virtual Assistant

- 24/7 intelligent chat
- Real-time data access
- Automatic action execution
- Personalized recommendations
- Multilingual support
- Continuous learning

### 👥 Employee Portal

- Personalized dashboard
- Complete profile
- Career timeline
- Badges and recognition
- Birthdays and anniversaries
- Team members

### 📱 Mobile-First

- Responsive design
- PWA (Progressive Web App)
- Push notifications
- Offline-first
- Optimized performance

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │ Vacation │  │   Time   │  │  Chat   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────┐
│                   Backend (Go + Fiber)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   API    │  │Middleware│  │ Handlers │  │Services │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
         ↓                ↓                ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SQL Server  │  │ Azure OpenAI │  │    Redis     │
│   Database   │  │   (GPT-4)    │  │    Cache     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Main Components

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui
- React Query

**Backend**
- Go 1.21+
- Fiber v2 (Web framework)
- GORM (ORM)
- JWT Authentication
- GraphQL (optional)

**Database**
- SQL Server (Azure)
- Redis (Cache)
- Blob Storage (Files)

**AI**
- Azure OpenAI (GPT-4)
- Function Calling
- RAG (Retrieval-Augmented Generation)
- Vector Database (optional)

---

## 🛠️ Technologies

### Backend

```go
// Main dependencies
github.com/gofiber/fiber/v2          // Web framework
github.com/golang-jwt/jwt/v5          // JWT authentication
gorm.io/gorm                          // ORM
github.com/Azure/azure-sdk-for-go    // Azure OpenAI
github.com/go-redis/redis/v8         // Redis cache
```

### Frontend

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "@tanstack/react-query": "5.x"
  }
}
```

---

## 📦 Installation

### Prerequisites

- Go 1.21+
- Node.js 18+
- SQL Server (local or Azure)
- Redis (optional, for caching)
- Azure OpenAI (for AI features)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/frappyou.git
cd frappyou
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
go mod download

# Copy example .env
cp .env.example .env

# Configure environment variables
nano .env
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Copy .env
cp .env.example .env.local

# Configure variables
nano .env.local
```

### 4. Database Setup

```sql
-- Create database
CREATE DATABASE FrappYOU;

-- Tables will be created automatically on first run
```

---

## ⚙️ Configuration

### Backend (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=FrappYOU

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4-frappyou
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Redis (optional)
REDIS_URL=localhost:6379

# Server
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=FrappYOU
```

---

## 🚀 Usage

### Start Backend

```bash
cd backend

# Development mode
go run main.go

# or with helper script
./run-backend.sh

# Build for production
go build -o frappyou-api
./frappyou-api
```

### Start Frontend

```bash
cd frontend

# Development mode
npm run dev

# Build for production
npm run build
npm start
```

### Access Application

```
Frontend: http://localhost:3000
Backend API: http://localhost:8080
Health Check: http://localhost:8080/health
GraphQL Playground: http://localhost:8080/playground
```

### Default Credentials

```
Admin:
Email: admin@frappyou.com
Password: admin123

Employee:
Email: user@frappyou.com
Password: user123
```

---

## 🤖 Frappy AI

### Features

The Frappy AI assistant uses Azure OpenAI (GPT-4) with:

1. **Function Calling** - Executes actions automatically
2. **RAG** - Accesses company documents
3. **Smart Cache** - Fast responses
4. **Context Injection** - Personalized data

### Usage Examples

```
User: "How many vacation days do I have?"
Frappy: "You have 30 vacation days available! 📅
Your accrual period is from 03/01/2023 to 02/28/2024
and you need to use them by 02/28/2025."

---

User: "I want to take 15 days in January"
Frappy: "Done! ✅ Your vacation has been requested:
- Period: 01/10/2025 - 01/24/2025 (15 days)
- Status: Pending manager approval"

---

User: "How does remote work work?"
Frappy: "The company's remote work policy is:
🏠 Mode: Hybrid (2 days/week)
📋 Requirements: Min 10 Mbps internet
⏰ Hours: Same as office hours"
```

### Available Functions

- ✅ Check vacation, attendance, payroll
- ✅ Request vacation and justifications
- ✅ Clock in/out
- ✅ Enroll in courses
- ✅ Approve requests (managers)
- ✅ Search company policies

---

## 📡 API

### Authentication

```bash
# Login
POST /api/auth/login
{
  "email": "user@frappyou.com",
  "password": "password123"
}

# Response
{
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Vacation

```bash
# Check balance
GET /api/vacation/balance
Authorization: Bearer {token}

# Request vacation
POST /api/vacation
{
  "start_date": "2025-01-10",
  "days": 15
}
```

### AI Chat

```bash
# Send message
POST /api/chat/message
{
  "message": "How many vacation days do I have?",
  "conversation_id": "abc123"
}

# Streaming (SSE)
POST /api/chat/stream
```

### Complete Documentation

```
Swagger UI: http://localhost:8080/swagger
GraphQL Playground: http://localhost:8080/playground
```

---

## 🌐 Deployment

### Azure App Service

```bash
# 1. Create resources
az group create --name frappyou-rg --location eastus

# 2. Create App Service
az webapp create \
  --resource-group frappyou-rg \
  --plan frappyou-plan \
  --name frappyou-api \
  --runtime "GO:1.21"

# 3. Configure environment variables
./configure-azure-env.sh

# 4. Deploy
az webapp deployment source config-zip \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --src backend.zip
```

### Docker

```bash
# Build
docker build -t frappyou-api ./backend
docker build -t frappyou-web ./frontend

# Run
docker-compose up -d
```

### Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

---

## 📊 Metrics and Monitoring

### Available Dashboards

- **Executive Overview** - Main KPIs
- **HR Analytics** - Turnover, hiring, costs
- **Engagement** - Satisfaction, courses, feedback
- **Performance** - Team and individual
- **AI** - Usage, costs, quality

### Estimated Costs (100 users)

```
Azure OpenAI (GPT-4): ~$600/month
Azure SQL Server: ~$100/month
Azure App Service: ~$150/month
Redis Cache: ~$50/month
Storage: ~$20/month

TOTAL: ~$920/month
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Guidelines

- Follow Go and TypeScript conventions
- Add tests for new features
- Update documentation
- Maintain backward compatibility

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Development**: FrappYOU Team
- **AI**: Azure OpenAI Integration
- **Design**: UI/UX Team

---

## 📞 Support

- 📧 Email: support@frappyou.com
- 💬 Discord: [FrappYOU Community](https://discord.gg/frappyou)
- 📚 Docs: [docs.frappyou.com](https://docs.frappyou.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/frappyou/issues)

---

## 🗺️ Roadmap

### Q1 2025
- ✅ Base HR system
- ✅ Frappy AI
- ✅ E-Learning
- 🚧 Mobile App

### Q2 2025
- 📋 Recruitment (ATS)
- 📋 Performance Review
- 📋 Benefits Management

### Q3 2025
- 📋 Advanced Analytics (BI)
- 📋 ERP Integration
- 📋 Public APIs

---

**Made with ❤️ by FrappYOU Team**
