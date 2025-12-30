# Development Environment Setup Guide

This guide will help you set up your local development environment for the Take an Umbrella project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **PostgreSQL**: v14.0 or higher
- **Git**: Latest version
- **Docker** (optional, for containerized development): v20.0 or higher
- **Docker Compose** (optional): v2.0 or higher

### Verify Installation

```bash
node --version
npm --version
psql --version
git --version
docker --version  # if using Docker
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env  # if .env.example exists
# or create .env manually
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/take_an_umbrella?schema=public

# Weather API (기상청 API)
WEATHER_API_KEY=your_weather_api_key_here
WEATHER_API_URL=https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0

# JWT (for future use)
JWT_SECRET=your_jwt_secret_here

# FCM (Firebase Cloud Messaging)
FCM_SERVER_KEY=your_fcm_server_key_here
```

**How to get API keys:**

1. **기상청 API 키**:
   - Visit https://www.data.go.kr/
   - Sign up and apply for "기상청_단기예보 ((구)_동네예보) 조회서비스"
   - Copy your service key

2. **FCM Server Key**:
   - Create a Firebase project at https://console.firebase.google.com/
   - Go to Project Settings > Cloud Messaging
   - Copy the Server Key

### 3. Database Setup

#### Option A: Local PostgreSQL

1. **Install PostgreSQL** (if not installed):
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@14
   brew services start postgresql@14
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database and user
   CREATE DATABASE take_an_umbrella;
   CREATE USER take_umbrella_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE take_an_umbrella TO take_umbrella_user;
   \q
   ```

3. **Update DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL=postgresql://take_umbrella_user:your_password@localhost:5432/take_an_umbrella?schema=public
   ```

#### Option B: Docker Compose (Recommended)

1. **Start Docker Containers**:

The `docker-compose.yml` file is already created in the project root.

```bash
# Start containers
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

**Test Docker Compose Setup:**

```bash
# Run test script (optional)
./scripts/test-docker-compose.sh
```

2. **Create `.env` file** in `backend/` directory:

Copy the example file and update with your values:

```bash
cd backend
cp .env.example .env
```

The `.env.example` file already contains the correct DATABASE_URL for Docker Compose. You only need to update API keys and secrets.

### 4. Database Migration

Run Prisma migrations to create database schema:

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

**Note**: If you encounter migration errors, you may need to reset the database:

```bash
npx prisma migrate reset
```

### 5. Seed Initial Data (Optional)

Create seed file for initial recommendation rules:

```bash
# Create prisma/seed.ts (if needed)
# Run seed
npx prisma db seed
```

### 6. Start Development Server

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:3000`

**Verify Installation:**

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","message":"Server is running"}
```

## Frontend Setup (Flutter)

### 1. Install Flutter

Follow the official Flutter installation guide:
https://docs.flutter.dev/get-started/install

**Verify Installation:**

```bash
flutter doctor
```

### 2. Create Flutter Project

```bash
# Navigate to project root
cd /Users/jamie/Desktop/Project/Take_an_umbrella

# Create Flutter project
flutter create frontend

# Navigate to frontend
cd frontend
```

### 3. Install Dependencies

```bash
cd frontend
flutter pub get
```

### 4. Configure Environment

Create `.env` file in `frontend/` directory:

```env
API_BASE_URL=http://localhost:3000
```

### 5. Run Flutter App

```bash
# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android

# Specific device
flutter devices
flutter run -d <device_id>
```

## Development Tools

### VS Code Extensions (Recommended)

- **Prisma**: `Prisma.prisma`
- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`
- **Dart**: `Dart-Code.dart-code`
- **Flutter**: `Dart-Code.flutter`

### Useful Commands

#### Backend

```bash
# Development
npm run dev              # Start dev server with hot reload

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

#### Frontend (Flutter)

```bash
# Development
flutter run              # Run app
flutter run --release    # Run in release mode

# Testing
flutter test             # Run tests
flutter test --coverage  # Generate coverage

# Code Quality
flutter analyze          # Analyze code
flutter format .         # Format code

# Build
flutter build ios        # Build iOS app
flutter build apk        # Build Android APK
```

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:
1. Check if PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string in `.env`
3. Check firewall settings
4. For Docker: `docker-compose ps` to verify containers are running

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solutions**:
1. Change PORT in `.env` file
2. Kill process using port 3000:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

### Prisma Migration Errors

**Problem**: Migration fails

**Solutions**:
1. Reset database (⚠️ **WARNING**: This will delete all data):
   ```bash
   npx prisma migrate reset
   ```

2. Check database connection
3. Verify schema.prisma syntax: `npx prisma format`

### Module Not Found Errors

**Problem**: Cannot find module

**Solutions**:
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

## Project Structure

```
Take_an_umbrella/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Express middlewares
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript types
│   │   └── config/         # Configuration
│   ├── prisma/             # Prisma schema and migrations
│   ├── src/__tests__/      # Test files
│   └── package.json
├── frontend/                # Flutter app (to be created)
├── docs/                    # Public documentation
├── md/                      # Private documentation
│   └── process/            # Work process documentation
└── docker-compose.yml      # Docker setup (optional)
```

## Next Steps

After setting up your development environment:

1. ✅ Verify all services are running
2. ✅ Run tests to ensure everything works
3. ✅ Check API documentation: `docs/API_DOCUMENTATION.md`
4. ✅ Review development roadmap: `md/07_개발-로드맵.md`
5. ✅ Start developing! 🚀

## Getting Help

- Check `docs/TROUBLESHOOTING.md` for common issues
- Check GitHub Issues for known problems
