# 🛠️ AutoFix: Professional Workshop Management System

**AutoFix** is a state-of-the-art, full-stack vehicle maintenance and spare parts marketplace platform. It is engineered to streamline workshop operations, providing specialized interfaces for Customers, Mechanics, and Workshop Owners with real-time connectivity.

![Status: Ready for Presentation](https://img.shields.io/badge/Status-Ready_for_Presentation-success?style=for-the-badge)
![Tech: ASP.NET Core](https://img.shields.io/badge/Backend-ASP.NET_Core_8.0-512bd4?style=for-the-badge&logo=dotnet)
![Tech: React](https://img.shields.io/badge/Frontend-React_18-61dafb?style=for-the-badge&logo=react)
![Tech: Axios](https://img.shields.io/badge/API_Client-Axios-5a29e4?style=for-the-badge&logo=axios)
![Auth: Keycloak](https://img.shields.io/badge/Identity-Keycloak-f0803c?style=for-the-badge&logo=keycloak)

---

## ✨ Application Description

AutoFix is a comprehensive solution for modern automotive service centers. It handles the entire lifecycle of car repairs—from customer registration and service booking to inventory management and automated billing.

### Key Modules:
- **🛒 Spare Parts Marketplace**: A public-facing catalog where users can browse parts by category, view real-time stock, and manage private shopping carts.
- **⚡ Real-Time Notifications**: Integrated SignalR connectivity ensures mechanics and owners see new orders and status updates instantly without refreshing.
- **🔧 Repair Workflow**: Digital tracking of repair orders, mechanic self-assignment (Claiming), and automated receipt generation.
- **📊 Business Intelligence**: High-level dashboards for owners to track revenue, team efficiency, and inventory health.
- **🌐 React + Axios Integration**: A modular architecture where all API communication is handled through a centralized Axios client with automated token injection and error handling.

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** (v18+)
- **.NET SDK** (v8.0)
- **Docker Desktop** (for Keycloak and SQL Server)

### 1. Backend Setup
```bash
# 1. Start Infrastructure (Keycloak + DB)
docker-compose up -d

# 2. Initialize Database & Run API
# From the root directory
dotnet run
```
*The backend runs at `http://localhost:5005`. Swagger UI is available at `/swagger`.*

### 2. Frontend Setup
```bash
# 1. Navigate to frontend directory
cd autofix-frontend

# 2. Install dependencies
npm install

# 3. Launch application
npm start
```
*The frontend runs at `http://localhost:3000`.*

---

## 🔑 Access Roles
| Role | Responsibility |
| :--- | :--- |
| **Owner** | Full oversight, financial reports, team management, and catalog control. |
| **Mechanic** | Order claiming, repair execution, and inventory stock adjustment. |
| **Customer** | Vehicle management, service booking, and marketplace shopping. |

---

## 📡 API Routes Overview

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | System authentication |
| **Cars** | `GET/POST` | `/api/cars` | Manage customer vehicles |
| **Marketplace** | `GET` | `/api/spareparts/public-list` | View public catalog |
| | `GET` | `/api/spareparts/category/{id}` | Filter parts by category |
| **Cart** | `POST` | `/api/cart/add` | Add part to private cart |
| | `POST` | `/api/cart/checkout` | Convert cart to order/receipt |
| **Repairs** | `GET` | `/api/repairorders` | List all repair jobs |
| | `PATCH` | `/api/repairorders/{id}/claim` | Mechanic claims an order |
| | `PUT` | `/api/repairorders/{id}` | Update repair status |
| **Inventory** | `PATCH` | `/api/spareparts/{id}/stock` | Adjust stock levels |
| **Admin** | `GET` | `/api/customers` | List all registered users |
| | `GET` | `/api/receipts` | View all transaction history |

---

## 🏗️ Technical Stack

- **Frontend**: React 18 + Axios (Centralized modular API layer), React Router 6, Recharts, Lucide Icons.
- **Backend**: ASP.NET Core 8, Entity Framework Core, SignalR (Real-time), Hangfire.
- **Identity**: Keycloak OIDC (OpenID Connect) for secure multi-role access.
- **Styling**: Modern Vanilla CSS with Glassmorphism and Responsive Tokens.

---
*Developed for Web Engineering - AutoFix Professional Platform.*
