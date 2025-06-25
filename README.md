# Competitive Programming Backend (CPBack)

A robust Node.js backend API for competitive programming platform with real-time contest management, code compilation, and user authentication.

## 🚀 Features

- **User Management**: Firebase-based authentication with admin controls
- **Contest System**: Tournament-style contests with bracket management
- **Code Compilation**: Integration with Judge0 API for multi-language support
- **Real-time Communication**: Socket.IO for live contest updates
- **Problem Management**: CRUD operations for programming problems
- **Test Case Management**: Automated test case validation
- **Match System**: Head-to-head programming competitions

## 📁 Project Structure

```
CPBack/
├── 📄 app.js                     # Main application entry point
├── 📄 DB.js                      # MongoDB connection configuration
├── 📄 firebase.js                # Firebase admin SDK configuration
├── 📄 socket.js                  # Socket.IO server setup
├── 📄 package.json               # Project dependencies and scripts
├── 📄 serviceAccountKey.json     # Firebase service account credentials
├── 📄 .env.example               # Environment variables template
├── 📄 README.md                  # Project documentation
│
├── 📁 controllers/               # Business logic controllers
│   ├── 📄 compilerController.js  # Code compilation and execution
│   ├── 📄 contestController.js   # Contest management operations
│   ├── 📄 problemController.js   # Problem CRUD operations
│   ├── 📄 testcaseController.js  # Test case management
│   ├── 📄 userController.js      # User authentication and management
│   └── 📄 questionsData.json     # Sample question data
│
├── 📁 middleware/                # Express middleware
│   └── 📄 auth.js                # Authentication and authorization
│
├── 📁 models/                    # MongoDB schemas
│   ├── 📄 Contests.js            # Contest data model
│   ├── 📄 Problems.js            # Problem data model
│   ├── 📄 TestCases.js           # Test case data model
│   └── 📄 User.js                # User data model
│
├── 📁 routes/                    # API route definitions
│   ├── 📄 compilerRoutes.js      # Code compilation endpoints
│   ├── 📄 contestRoutes.js       # Contest management endpoints
│   ├── 📄 problemRoutes.js       # Problem management endpoints
│   ├── 📄 testcasesRoutes.js     # Test case endpoints
│   └── 📄 userRoutes.js          # User management endpoints
│
└── 📁 scripts/                   # Utility scripts
    ├── 📄 code.py                # Python execution script
    ├── 📄 main.cpp               # C++ execution script
    ├── 📁 array_sum_tests/       # Test cases for array sum problem
    └── 📁 factorial_tests/       # Test cases for factorial problem
```

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK
- **Real-time**: Socket.IO
- **Code Execution**: Judge0 API
- **File Upload**: Multer
- **Environment**: dotenv

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Firebase project with service account
- Judge0 API instance (**Recommended: Self-hosted for production**)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CPBack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
# Server configuration
PORT=3000
NODE_ENV=development

# Judge0 API configuration
JUDGE0=https://your-judge0-instance.com

# Database configuration
MONGO=mongodb://localhost:27017/cp_platform
# For MongoDB Atlas: MONGO=mongodb+srv://username:password@cluster.mongodb.net/cp_platform

# Judge0 Authentication (if required)
JUDGE0_AUTH_USER=your_auth_user
JUDGE0_AUTH_TOKEN=your_auth_token
```

### 4. Firebase Setup
1. Download your Firebase service account key from Firebase Console
2. Save it as `serviceAccountKey.json` in the project root
3. Ensure the file is included in `.gitignore` for security

### 5. Start the Server
```bash
npm start
# or for development
npm run dev
```

The server will run on `http://localhost:3000`

## 📡 API Endpoints

### 🔐 Authentication
All endpoints (except compiler routes in testing mode) require Firebase authentication token in the header:
```
Authorization: Bearer <firebase-token>
```

### 👤 User Management (`/api/users`)

| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| `POST` | `/login` | User login | ❌ |
| `POST` | `/signup` | User registration | ❌ |
| `GET` | `/admin` | Admin dashboard data | ✅ |
| `GET` | `/info` | Current user information | ❌ |
| `GET` | `/all` | Fetch all users | ❌ |
| `POST` | `/registerContest` | Register for contest | ❌ |
| `GET` | `/checkContestRegistration/:contestId` | Check contest registration | ❌ |
| `POST` | `/changeUserStatus` | Change user status | ❌ |
| `POST` | `/getUserByUid` | Get user by Firebase UID | ❌ |
| `GET` | `/searchMatch` | Search for match opponents | ❌ |

### 🏆 Contest Management (`/api/contests`)

| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| `POST` | `/add` | Create new contest | ✅ |
| `PUT` | `/edit/:id` | Edit contest | ✅ |
| `DELETE` | `/delete/:id` | Delete contest | ✅ |
| `GET` | `/getcon/:id` | Get contest by ID | ❌ |
| `GET` | `/getall` | Get all contests | ❌ |
| `POST` | `/getUserMatchInfo` | Get user match info | ❌ |
| `POST` | `/startContest` | Start contest round | ✅ |
| `POST` | `/updateMatchWinner` | Update match winner | ✅ |
| `POST` | `/addProblemToContest` | Add problem to contest | ✅ |
| `GET` | `/getContestProblems/:id` | Get contest problems | ✅ |
| `GET` | `/getRandomContestProblem/:id` | Get random contest problem | ❌ |
| `POST` | `/removeProblemFromContest` | Remove problem from contest | ✅ |

### 💻 Code Compilation (`/api/compiler`)

| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| `GET` | `/getLanguages` | Get supported languages | ❌ |
| `POST` | `/submitCode` | Submit and execute code | ❌ |

**Submit Code Request Body:**
```json
{
    "language_id": 54,
    "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int x, y;\n    cin >> x >> y;\n    cout << (x+y) << endl;\n    return 0;\n}",
    "question_id": "***",
    "userID": "***",
    "runSampleOnly": false
}
```

> **⚠️ Important**: For production use with multiple concurrent users, it's highly recommended to deploy your own Judge0 instance rather than using public instances. This ensures:
> - Better scalability and performance
> - No rate limiting issues
> - Consistent response times
> - Better control over supported languages and configurations
> - Enhanced security and privacy

#### High-Scale Deployment (1000+ concurrent users)
```bash
# Multi-instance setup with load balancer
# 1. Deploy multiple Judge0 instances
for i in {1..5}; do
    docker run -d --name judge0-worker-$i \
        -p $((2358 + $i)):2358 \
        -e REDIS_HOST=your-redis-cluster \
        -e DB_HOST=your-postgres-cluster \
        judge0/judge0:latest
done

# 2. Setup nginx load balancer
# nginx.conf example:
upstream judge0_backend {
        least_conn;
        server localhost:2359;
        server localhost:2360;
        server localhost:2361;
        server localhost:2362;
        server localhost:2363;
}
```

#### Cloud Deployment Recommendations

**AWS Setup (Recommended for 1000+ users):**
```bash
# Use ECS/EKS with auto-scaling
# - Application Load Balancer
# - RDS PostgreSQL (Multi-AZ)
# - ElastiCache Redis Cluster
# - ECS Service with 5-10 Judge0 instances
# - Auto-scaling based on CPU/memory metrics
```

**Docker Swarm Setup:**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
    judge0:
        image: judge0/judge0:latest
        deploy:
            replicas: 5
            resources:
                limits:
                    cpus: '2'
                    memory: 4G
        environment:
            - REDIS_HOST=redis-cluster
            - DB_HOST=postgres-cluster
```

#### Performance Optimizations for Scale

**Queue Management:**
```bash
# Configure Judge0 for high throughput
RAILS_MAX_THREADS=20
WEB_CONCURRENCY=4
ENABLE_WAIT_RESULT=false
ENABLE_COMPILER_OPTIONS=false
```

**Resource Allocation:**
- **CPU**: 2-4 cores per Judge0 instance
- **Memory**: 4-8GB per instance
- **Storage**: SSD with 100+ IOPS
- **Network**: Low-latency connection between services

#### Benefits of Self-hosted Judge0 at Scale:
- **Handles 10,000+ submissions/hour** with proper setup
- **Sub-second response times** with optimized configuration
- **Cost savings**: ~$200/month vs $2000+/month for equivalent SaaS
- **Custom security policies** and sandboxing
- **Full monitoring and logging** control
- **Language customization** and version control

#### Monitoring & Maintenance
```bash
# Essential monitoring setup
- Prometheus + Grafana for metrics
- ELK stack for log aggregation  
- Health checks every 30 seconds
- Auto-restart on failures
- Database connection pooling
- Redis clustering for high availability
```

**Production Checklist:**
- [ ] Load balancer with health checks
- [ ] Database clustering (PostgreSQL)
- [ ] Redis cluster for session management
- [ ] Auto-scaling policies
- [ ] Monitoring and alerting
- [ ] Backup and disaster recovery
- [ ] Security hardening and network isolation

### Production Setup
1. Set `NODE_ENV=production` in environment variables
2. Configure production MongoDB database
3. Set up proper Firebase project for production
4. Deploy your own Judge0 instance (highly recommended)
5. Configure reverse proxy (nginx) for production

### Docker Support
```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common issues

---

**Note**: This is a backend API server. For the complete competitive programming platform, you'll need a corresponding frontend application.