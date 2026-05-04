# 🛠️ AutoFix Management System

AutoFix is a professional full-stack car repair management system designed for workshops. It features a robust ASP.NET Core backend and a modern React frontend, integrated with Keycloak for secure authentication.

---

## 🚦 Quick Start: How to Run the Project

You can run the project in two ways: **Local Development** (Recommended for editing) or **Full Docker**.

### 1. Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js & npm](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 2. Run in Local Development Mode (Backend + Frontend)

#### Step A: Start Keycloak (Identity Provider)
The application requires Keycloak for authentication. Use the provided docker-compose to start it:
```bash
docker-compose up -d keycloak keycloak-db
```
*Wait ~30 seconds for Keycloak to initialize.*

#### Step B: Run the Backend API
1. Navigate to the root directory (`AutoFix`).
2. Run the API:
   ```bash
   dotnet run
   ```
*The API will start on `http://localhost:5005`.*

#### Step C: Run the Frontend
1. Open a new terminal in the `autofix-frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
*The frontend will start on `http://localhost:3000` (or `3001` if 3000 is occupied).*

---

### 3. Run in Full Docker Mode
To launch the entire stack (API, DB, Keycloak) using containers:
```bash
docker-compose up -d --build
```
- **API**: `http://localhost:5000`
- **Swagger**: `http://localhost:5000/swagger`
- **Keycloak**: `http://localhost:8080`

---

## 🔐 Default Credentials
- **Owner Account**: `owner` / `password` (Recommended for testing the Admin Hub)
- **Mechanic Account**: `mechanic` / `password`
- **Customer Account**: `customer` / `password`

---

## 🏗️ Architecture Overview
- **Backend**: ASP.NET Core 8.0, Entity Framework Core (SQLite local), Hangfire (Jobs).
- **Frontend**: React 18, Vite, custom "Pro OS" styling.
- **Identity**: Keycloak (OIDC) with automated user provisioning.

---

## 📄 Accessing Documentation
- **Swagger UI**: Access `/swagger` on the API port to test endpoints directly.
- **Walkthrough**: Refer to [walkthrough.md](./walkthrough.md) for a deep dive into the code logic.
