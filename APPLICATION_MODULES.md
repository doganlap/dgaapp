# 📊 Application Modules Overview

## 🎯 Two Main Modules

The DGA Oversight Platform consists of **two distinct modules**:

---

## 1️⃣ **DGA Module** - Performance Monitoring & Oversight

**Purpose**: Digital Government Authority oversight, performance monitoring, and digital transformation tracking.

### Features:
- ✅ **Entities Management** - Track 158 government entities across 5 regions
- ✅ **Programs Management** - Monitor digital transformation programs
- ✅ **Budget Tracking** - Financial oversight and budget allocation
- ✅ **Reports & Analytics** - National and regional reporting
- ✅ **User Management** - Access control and user administration
- ✅ **Performance KPIs** - Key performance indicators tracking
- ✅ **Digital Maturity Scores** - Entity maturity assessment

### Pages:
- `/` - Dashboard (Performance Overview)
- `/entities` - Government Entities (158 entities)
- `/programs` - Digital Transformation Programs
- `/budget` - Budget Management
- `/reports` - Reports & Analytics
- `/users` - User Management
- `/finance-demo` - Financial Control Demo

### Data Focus:
- Entity performance metrics
- Program completion rates
- Budget utilization
- Regional distribution
- Sector analysis
- Digital transformation progress

---

## 2️⃣ **GRC Module** - Governance, Risk & Compliance

**Purpose**: Production-grade Governance, Risk Management, and Compliance tracking.

### Features:
- ✅ **Risk Management** - Identify, assess, and mitigate organizational risks
- ✅ **Compliance Tracking** - Monitor compliance with standards (NCA ECC, PDPL, ISO 27001)
- ✅ **Governance Dashboard** - Executive overview of GRC metrics
- ✅ **Insights & Analytics** - AI-powered recommendations and trends
- ✅ **Audit Trail** - Complete compliance audit history
- ✅ **Risk Assessment** - Severity-based risk categorization

### Pages:
- `/grc` - GRC Dashboard
- `/grc/risks` - Risk Management
- `/grc/compliance` - Compliance Management
- `/grc/insights` - Insights & Analytics

### Data Focus:
- Risk severity levels (High, Medium, Low)
- Compliance status (Compliant, Non-Compliant, In Progress)
- Standard adherence tracking
- Risk mitigation plans
- Compliance audit dates
- Governance metrics

---

## 🔄 Module Comparison

| Feature | DGA Module | GRC Module |
|---------|-----------|------------|
| **Purpose** | Performance Monitoring | Risk & Compliance |
| **Focus** | Digital Transformation | Governance & Security |
| **Entities** | 158 Government Entities | All Entities (Risk/Compliance) |
| **Data Type** | Performance Metrics | Risk & Compliance Records |
| **Status** | Demo/Development | Production-Ready |
| **Tables** | dga_entities, dga_programs, dga_budget | risks, compliance_records |

---

## 🎨 Navigation Structure

```
DGA Platform
├── DGA Section (Performance Monitoring)
│   ├── Dashboard
│   ├── Entities
│   ├── Programs
│   ├── Budget
│   ├── Reports
│   └── Users
│
└── GRC Section (Governance, Risk, Compliance)
    ├── GRC Dashboard
    ├── Risks
    ├── Compliance
    └── Insights
```

---

## 📊 Data Flow

### DGA Module Data:
- **Source**: Government entities, programs, budgets
- **Storage**: `dga_entities`, `dga_programs`, `dga_budget`, `dga_kpi_reports`
- **Purpose**: Track performance, progress, and digital transformation

### GRC Module Data:
- **Source**: Risk assessments, compliance audits
- **Storage**: `risks`, `compliance_records`
- **Purpose**: Manage risks and ensure compliance

---

## ✅ Current Status

- ✅ **DGA Module**: Fully functional with interactive tables
- ✅ **GRC Module**: Production-ready with full CRUD operations
- ✅ **Database**: Both modules integrated
- ✅ **Frontend**: Both modules accessible via sidebar
- ✅ **Backend**: Separate API routes for each module

---

## 🚀 Usage

### Access DGA Module:
Navigate to any DGA page from the sidebar (Dashboard, Entities, Programs, etc.)

### Access GRC Module:
Navigate to GRC section from the sidebar (GRC Dashboard, Risks, Compliance, Insights)

---

**Status**: ✅ **Both modules are operational and ready for use!**

