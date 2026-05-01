# AutoFix Frontend

React + TypeScript frontend for the AutoFix Car Repair Shop Management API.

## Description

AutoFix Frontend is a role-based dashboard application that connects to the 
AutoFix ASP.NET Core 8 Web API. It supports three user roles:
- **Admin** — full system management (customers, mechanics, repair orders, spare parts)
- **Mechanic** — view and update assigned repair orders, view spare parts
- **Customer** — manage their own cars and submit repair orders

## Tech Stack

- React 18 + TypeScript
- Vite (build tool and dev server)
- React Router v6 (client-side routing)
- Axios (HTTP client for API communication)
- Recharts (dashboard charts)
- Lucide React (icons)

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- The AutoFix backend API running at http://localhost:5000 
  (either via `dotnet run` or Docker)

### Run the frontend

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/autofix-frontend.git
cd autofix-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Environment variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

The default `.env` is already configured for local development:
VITE_API_BASE_URL=/api

## Running the full stack

### Option A — Backend with Docker (recommended)

```bash
# Start the backend (API + SQL Server + Keycloak)
cd ../AutoFix
docker compose up --build

# In a separate terminal, start the frontend
cd ../autofix-frontend
npm run dev
```

### Option B — Backend without Docker

```bash
# Set environment variables and run the API
cd ../AutoFix
dotnet run

# In a separate terminal
cd ../autofix-frontend
npm run dev
```

## API Routes Used

| Method | Endpoint | Used in |
|--------|----------|---------|
| POST | /api/auth/login | LoginPage |
| POST | /api/auth/refresh | axiosClient (auto refresh) |
| GET | /api/customers | CustomersPage |
| POST | /api/customers | CustomersPage (create form) |
| PUT | /api/customers/:id | CustomerDetailPage (edit form) |
| DELETE | /api/customers/:id | CustomersPage |
| GET | /api/mechanics | MechanicsPage |
| POST | /api/mechanics | MechanicsPage (create form) |
| GET | /api/repairorders | RepairOrdersPage |
| POST | /api/repairorders | MyRepairOrdersPage (customer) |
| PUT | /api/repairorders/:id | RepairOrdersPage (update status) |
| GET | /api/services | ServicesPage, CreateRepairOrder |
| GET | /api/spareparts | SparePartsPage |
| PATCH | /api/spareparts/:id/stock | SparePartsPage (adjust stock) |
| GET | /api/sparepartcategories | SparePartCategoriesPage |
| GET | /api/cars | MyCarsPage |
| POST | /api/cars | MyCarsPage (add car form) |

## Screenshots

(Add screenshots here after running the application)
