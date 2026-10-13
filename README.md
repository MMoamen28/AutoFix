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
*The backend runs at `http://localhost:5000`. Swagger UI is available at `/swagger`.*

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

## 🌐 Internationalization (i18n) & RTL Standard

AutoFix features full bilingual support (English & Arabic) with real-time RTL mirroring:
- **Zero Hardcoded Strings**: All UI labels, placeholders, headers, dialogs, warnings, and error messages must use translation keys from `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`.
- **Key Parity Enforcement**: Every key in `en.json` must exist in `ar.json` and vice-versa. Run `npm test` (`node scripts/check-i18n-keys.cjs`) to verify parity before committing.
- **RTL & Logical Properties**: All new screens (e.g., Car Inspection Report, Search, Finance) must use CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start`) so one layout automatically mirrors in RTL (`dir="rtl"`, `lang="ar"`).
- **Numbers & Dates**: Display dates via `formatDate()` (`dd/MM/yyyy`) and money via `formatCurrency()` (`ج.م` / `EGP`), respecting the Western vs Arabic-Indic digits setting. User-entered data is never modified or translated.

---

## 📱 مشاركة الشبكة وتشغيل الموبايل (Phone & Network Access)

لفتح البرنامج من الهاتف المحمول على نفس شبكة Wi-Fi بالورشة:

### 1. تفعيل جدار الحماية (Windows Firewall)
قم بتشغيل ملف الـ PowerShell لفتح المنفذ 5000 على الشبكات الخاصة (Private) فقط:
```powershell
powershell -ExecutionPolicy Bypass -File .\Enable-NetworkAccess.ps1
```
ولإغلاق المنفذ لاحقاً:
```powershell
powershell -ExecutionPolicy Bypass -File .\Disable-NetworkAccess.ps1
```

### 2. تثبيت عنوان IP للابتوب في الراوتر (Router Fixed IP / DHCP Reservation)
لضمان عدم تغير رابط البرنامج على الهاتف:
1. افتح صفحة إعدادات الراوتر (عادة `192.168.1.1`).
2. سجّل الدخول وابحث عن قسم **DHCP Server** أو **LAN Setup**.
3. ابحث عن خيار **Static DHCP** أو **Address Reservation** (حجز IP ثابت).
4. أضف جهاز اللابتوب باستخدام عنوان الـ MAC Address الخاص به وحدد له عنوان IP ثابت (مثل `192.168.1.150`).
5. احفظ الإعدادات وأعد تشغيل الراوتر.

### 3. فتح البرنامج من الموبايل
1. تأكد من تفعيل "السماح للأجهزة الأخرى على شبكة الورشة" من نافذة الترس (الإعدادات).
2. افتح متصفح الهاتف واكتب: `http://<IP_اللابتوب>:5000` (أو امسح رمز الـ QR مباشرة بكاميرا الهاتف).
3. اختر اسم الجهاز عند الفتح لأول مرة (مثل "موبايل المحاسب").
4. يمكن تثبيت التطبيق على الشاشة الرئيسية للهاتف (Add to Home Screen) ليعمل كتطبيق كامل (PWA).

> [!CAUTION]
> لا تقم أبداً بفتح المنفذ 5000 على الشبكات العامة (Public Wi-Fi) أو عمل Port Forwarding إلى الإنترنت العام بدون تأمين إضافي.

---
*Developed for Web Engineering - AutoFix Professional Platform.*

