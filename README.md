# 🛠️ AutoFix: Professional Workshop Management System

**AutoFix** is a state-of-the-art, full-stack vehicle maintenance platform. It is engineered to streamline workshop operations, providing specialized interfaces for Customers, Mechanics, and Workshop Owners.

![Status: Ready for Presentation](https://img.shields.io/badge/Status-Ready_for_Presentation-success?style=for-the-badge)
![Tech: ASP.NET Core](https://img.shields.io/badge/Backend-ASP.NET_Core_8.0-512bd4?style=for-the-badge&logo=dotnet)
![Tech: React](https://img.shields.io/badge/Frontend-React_18_Vite-61dafb?style=for-the-badge&logo=react)
![Auth: Keycloak](https://img.shields.io/badge/Identity-Keycloak-f0803c?style=for-the-badge&logo=keycloak)

---

## ✨ Core Features & Requirements

This project strictly adheres to modern web engineering principles, specifically fulfilling requirements for **Frontend-Backend Integration**:

-   **🔐 Centralized Security**: A custom Axios client (`axiosClient.ts`) with automated HTTP Interceptors that handle Keycloak Bearer Token injection and session expiry (401 redirects).
-   **📦 Modular Service Layer**: All API logic is encapsulated in a dedicated `services/` directory. No hardcoded API calls exist within UI components.
-   **🔄 Full CRUD Lifecycle**: Services for `Cars`, `Spare Parts`, and `Repair Orders` support complete Create, Read, Update, and Delete operations.
-   **🎨 Pro OS Aesthetic**: A premium "Glassmorphism" UI built with React + Vite, featuring smooth transitions, vibrant accent palettes, and responsive layouts.
-   **👥 Role-Based Access Control (RBAC)**: Distinct dashboards and permissions for:
    -   **Owner**: Full financial oversight, inventory approvals, and fleet management.
    -   **Mechanic**: Repair job tracking, inventory access, and status updates.
    -   **Customer**: Vehicle registration, service booking, and repair history.

---

## 🏗️ Technical Architecture

### Frontend Layer (`/autofix-frontend`)
-   **Framework**: React 18 + Vite (TypeScript)
-   **State Management**: React Context (Auth) + Component-level `useState` hooks for loading/data/error states.
-   **API Client**: Axios with centralized configuration and interceptors.
-   **Styling**: Vanilla CSS with modern tokens (CSS Variables) for a consistent "Pro OS" look.

### Backend Layer (Root)
-   **API**: ASP.NET Core 8.0 Web API.
-   **Identity**: Keycloak OIDC integration for robust security.
-   **Persistence**: Entity Framework Core with SQLite (Dev) / SQL Server (Prod) support.
-   **Background Jobs**: Hangfire for automated service processing.

---

## 🚦 Quick Start: Local Deployment

### 1. Start Infrastructure (Docker)
Start Keycloak and the Identity database:
```bash
docker-compose up -d keycloak keycloak-db
```
*Wait ~30 seconds for Keycloak to initialize before starting the API.*

### 2. Launch Backend API
```bash
# From the root directory
dotnet run
```
*The API will be available at `http://localhost:5005` (with Swagger at `/swagger`).*

### 3. Launch React Frontend
```bash
cd autofix-frontend
npm install
npm run dev
```
*The UI will start on `http://localhost:3000`.*

---

## 🔑 Default Presentation Accounts
| Role | Username | Password |
| :--- | :--- | :--- |
| **Owner** | `owner` | `password` |
| **Mechanic** | `mechanic` | `password` |
| **Customer** | `customer` | `password` |

---

## 📁 Project Structure (Frontend Integration Focus)
```text
src/
├── components/         # Shared UI elements (Modals, Forms, Buttons)
│   └── customer/       # Feature-specific components (e.g. RegisterVehicleForm)
├── pages/              # Routed page components (Dashboards, Lists)
├── services/           # MODULAR API LAYER (Axios Clients)
│   ├── axiosClient.ts  # Centralized Axios config & Interceptors
│   ├── carService.ts   # CRUD logic for Vehicles
│   └── serviceService.ts # CRUD logic for Workshop Services
├── context/            # AuthContext (Keycloak integration)
└── router/             # AppRouter (Protected routes)
```

---

## 📝 Assignment Audit Checklist
- [x] **Centralized Axios Config**: Located in `src/services/axiosClient.ts`.
- [x] **Modular Services**: Service files in `src/services/` export distinct CRUD functions.
- [x] **Controlled Components**: Forms use `value` + `onChange` state mapping.
- [x] **State Handling**: Components implement `isLoading` and `error` UI feedback.
- [x] **Security**: JWT Bearer tokens are attached via Interceptors.

---
*Developed for Web Engineering Assignment - AutoFix Platform.*
