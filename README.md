# 🏭 GPPL Enterprise Asset Management System

> **Production-ready Enterprise Asset Management System for Ghaziabad Precision Product Private Limited**

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-green)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://postgresql.org)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 15+

### 1. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE gppl_eams;"
psql -U postgres -d gppl_eams -f database/schema.sql
psql -U postgres -d gppl_eams -f database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # Edit .env with your settings
flask db upgrade               # Run migrations
python app.py                  # Start backend on :5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev                    # Start frontend on :5173
```

### 4. Login
Open **http://localhost:5173** and login with:
- **Email:** `admin@gppl.in`
- **Password:** `Admin@1234`

---

## 🐳 Docker (One-Command Setup)

```bash
docker-compose up -d
```
Then open **http://localhost:3000**

---

## 📦 Project Structure

```
Asset Managment System/
├── backend/                  # Flask REST API
│   ├── api/v1/               # API blueprints (18 modules)
│   ├── models/               # SQLAlchemy models (15 models)
│   ├── services/             # Business logic services
│   ├── middleware/           # Auth & audit middleware
│   ├── uploads/              # File storage
│   └── app.py                # Application factory
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── pages/            # 25+ page components
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API service layer
│   │   └── hooks/            # Custom React hooks
│   └── src/index.css         # Design system
├── database/
│   ├── schema.sql            # Full PostgreSQL schema
│   └── seed.sql              # Demo data
├── docker-compose.yml
└── README.md
```

---

## 🔐 User Roles & Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@gppl.in | Admin@1234 |
| IT Admin | it.admin@gppl.in | Admin@1234 |
| HR | hr@gppl.in | Admin@1234 |

---

## 🗃️ Database Tables

| Table | Purpose |
|-------|---------|
| users, roles, permissions | RBAC |
| employees, departments, branches, locations | Organization |
| assets, asset_categories, asset_subcategories | Asset Registry |
| asset_allocations, allocation_approvals | Allocation Workflow |
| asset_returns, asset_transfers | Lifecycle |
| asset_history | Immutable Audit Trail |
| maintenance, amc_contracts | Service Management |
| complaints, complaint_updates | Ticketing |
| vendors | Vendor Management |
| purchase_orders, purchase_items | Procurement |
| notifications | In-app Alerts |
| audit_logs | System Audit |
| attachments | File Storage |
| system_settings | Configuration |

---

## 📡 API Endpoints

Base URL: `http://localhost:5000/api/v1`

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Dashboard | `GET /dashboard/stats`, `/dashboard/charts/*` |
| Assets | `GET/POST /assets`, `GET/PUT/DELETE /assets/:id`, `/assets/:id/qr` |
| Employees | `GET/POST /employees`, `GET/PUT /employees/:id` |
| Allocations | `POST /allocations`, `/allocations/:id/approve`, `/allocations/:id/allocate` |
| Returns | `POST /returns`, `/returns/:id/verify`, `/returns/:id/complete` |
| Transfers | `POST /transfers`, `/transfers/:id/complete` |
| Maintenance | `GET/POST /maintenance`, `PUT /maintenance/:id` |
| Complaints | `GET/POST /complaints`, `POST /complaints/:id/update` |
| Vendors | Full CRUD `/vendors` |
| Purchases | `POST /purchases`, `/purchases/:id/approve`, `/purchases/:id/receive` |
| Reports | `GET /reports/assets/csv`, `/reports/allocations/csv`, `/reports/summary` |
| Search | `GET /search?q=...` |
| Audit | `GET /audit` |

---

## ✨ Features

- 🏗️ **Complete Asset Lifecycle** — Purchase → Allocation → Transfer → Return → Disposal
- 👥 **7 Role Types** with granular permissions
- 📊 **Real-time Dashboard** with 12 KPI cards and 5 chart types
- 🔒 **JWT Authentication** with refresh tokens
- 📱 **Responsive Design** — works on all devices
- 🌙 **Dark Mode** support
- 📋 **Audit Logs** — every action tracked
- 🔍 **Global Search** across all entities
- 📄 **CSV/PDF Export** for all reports
- 🏷️ **QR Code & Barcode** generation for every asset
- 📧 **In-app Notifications** with real-time count
- 🐳 **Docker Ready** for deployment
- ⚡ **Multi-step Approval Workflows** for allocations

---

## 🔧 Configuration

Copy `backend/.env.example` to `backend/.env` and update:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gppl_eams
JWT_SECRET_KEY=your-very-secret-key
SECRET_KEY=another-secret-key
MAIL_USERNAME=your@email.com     # Optional
MAIL_PASSWORD=your-app-password  # Optional
```

---

## 📄 License

Proprietary — © 2024 Ghaziabad Precision Product Private Limited. All rights reserved.
