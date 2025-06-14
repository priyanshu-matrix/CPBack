# Competitive Programming Backend

A Node.js backend API for a competitive programming platform with real-time features.

## Features

- User authentication and management
- Contest management system
- Problem management with test cases
- Real-time code compilation and execution
- Socket.IO for real-time communication
- MongoDB database integration
- Firebase admin integration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **Real-time**: Socket.IO
- **Authentication**: Firebase Admin
- **Code Execution**: Judge0 API

## Prerequisites

- Node.js (>=16.0.0)
- npm (>=8.0.0)
- MongoDB Atlas account
- Firebase project with service account key
- Judge0 API access

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example` and configure:
   ```bash
   cp .env.example .env
   ```

4. Add your Firebase service account key as `serviceAccountKey.json`

5. Configure environment variables in `.env`

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `/api/users` - User management
- `/api/contests` - Contest management
- `/api/problems` - Problem management
- `/api/compiler` - Code compilation

## Deployment

### Heroku
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set KEY=value`
4. Deploy: `git push heroku main`

### Docker
```bash
docker build -t cpback .
docker run -p 3000:3000 --env-file .env cpback
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `MONGO` | MongoDB connection string | Yes |
| `JUDGE0` | Judge0 API URL | Yes |
| `JUDGE0_AUTH_USER` | Judge0 auth user | Yes |
| `JUDGE0_AUTH_TOKEN` | Judge0 auth token | Yes |

## Security Features

- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Request payload size limits
- Gzip compression

## License

ISC
