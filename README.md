# 🛠️ AutoFix Management System

[![.NET 8.0](https://img.shields.io/badge/.NET-8.0-512bd4?logo=dotnet)](https://dotnet.microsoft.com/download/dotnet/8.0)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ed?logo=docker)](https://www.docker.com/)
[![SQL Server](https://img.shields.io/badge/Database-SQL_Server-CC2927?logo=microsoft-sql-server)](https://www.microsoft.com/en-us/sql-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AutoFix** is a robust, enterprise-grade Auto Management & Repair System built with **ASP.NET Core 8.0**. Designed for high efficiency and scalability, it streamlines the workflow of automotive repair shops by managing customers, inventory, scheduling, and background monitoring tasks.

---

## 🚀 Key Features

*   **📋 Comprehensive Repair Orders:** Full lifecycle management of repair orders, transitions from diagnosis to completion.
*   **👤 Customer & Mechanic Profiles:** Detailed database of clients and staff with dedicated profile management.
*   **🏎️ Vehicle Database:** Integration with car license plate tracking and detailed model information.
*   **📦 Inventory & Stock Management:** Tracks spare parts, categories, and inventory health.
*   **🔐 Identity & Security:** Integrated JWT-based authentication (supporting external providers like Keycloak) with precise role-based access control.
*   **⚡ Automated Background Jobs:**
    *   **Flag Overdue Orders:** Detects repairs exceeding time limits.
    *   **Low Stock Alerts:** Automated check for inventory levels hitting minimum thresholds.
*   **🛡️ Robust Error Handling:** Centralized middleware for unified exception management.
*   **📖 Interactive Documentation:** Full OpenAPI/Swagger integration for easy API exploration and testing.

---

## 🏗️ Architecture

The project follows a modern **N-Layer Architecture**, ensuring separation of concerns and maintainability:

*   **`Controllers/`**: RESTful API endpoints.
*   **`Services/`**: Business logic implementations through interfaces (Service-Repository pattern).
*   **`Models/`**: Domain entities for EF Core mapping.
*   **`DTOs/`**: Data Transfer Objects for optimized request/response handling.
*   **`Data/`**: Database context and seeding logic (`DbInitializer`).
*   **`Jobs/`**: Background execution logic for recurring monitoring (Hangfire).
*   **`Middleware/`**: Global exception handlers and logging.

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | ASP.NET Core 8.0 (Web API) |
| **Database** | MS SQL Server 2022 |
| **ORM** | Entity Framework Core (Code First) |
| **Background Processing** | Hangfire |
| **Containerization** | Docker & Docker Compose |
| **API Testing** | Swagger UI (OpenAPI v3) |

---

## 🚦 Getting Started

### Prerequisites

*   [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 🚀 Running with Docker Compose (Recommended)

The easiest way to start the system is using the pre-configured orchestration:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-repo/autofix.git
    cd autofix
    ```

2.  **Spin up Services:**
    ```bash
    docker-compose up -d --build
    ```
    This command will launch the **API container** and the **SQL Server container**.

3.  **Automatic Seeding:**
    On the first run, the system automatically initializes the database schema and seeds initial test data (customers, parts, services) via the `DbInitializer`.

---

## 📄 Accessing Documentation

Once the services are running, the system provides several dashboards:

*   **Swagger API Docs:** [http://localhost:8080/swagger](http://localhost:8080/swagger)
    *   *Note: Detailed documentation for each endpoint including schemas and "Try it out" functionality.*
*   **Hangfire Dashboard:** [http://localhost:8080/hangfire](http://localhost:8080/hangfire)
    *   *Note: Monitor recurring jobs like overdue order flagging and inventory checks.*

---

## 🔧 Environment Variables

The application can be configured via environment variables in `docker-compose.yml`:

*   `ASPNETCORE_ENVIRONMENT`: Set to `Development` for detailed logging and Swagger.
*   `ConnectionStrings__DefaultConnection`: Database connection string for SQL Server.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the codebase, please open an issue or submit a pull request.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

<p align="center">Made with ❤️ for the Automotive Industry</p>
