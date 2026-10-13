# AutoFix Dummy & QA Simulation Data Summary

**Generated:** 2026-10-13  
**Database File:** `C:\AutoFixTestData\Dummy_View\autofix.db`  
**Application Host:** `http://localhost:5000` (Isolated read/browsing copy `Dummy_View`)  
**Production Isolation:** Strictly isolated from `C:\AutoFixData`  

---

## 1. Table Row Counts & Status Breakdown

| Table | Count | Breakdown / Notes |
| :--- | :---: | :--- |
| **Customers** | **95** | 91 active in UI, 4 soft-deleted/test accounts |
| **Cars** | **85** | Linked to active customers |
| **Mechanics** | **0** | Stage C / HR module not provisioned yet |
| **Services (Workmanship)** | **4** | Brake pads (250 EGP), Oil change (100 EGP), AC service (400 EGP), Computer diag (300 EGP) |
| **Spare Parts** | **4** | Oil Filter, Brake Pad Set, Engine Oil 5W-30, Headlight Bulb |
| **Work Orders** | **75** | **Pending:** 71 \| **Invoiced:** 2 \| **Cancelled:** 2 |
| **Invoices** | **71** | **Paid:** 68 \| **PartiallyPaid:** 3 |
| **Invoice Payments** | **71** | All recorded with user, payment method (Cash), and timestamp |
| **Refunds / Credit Notes** | **0** | Marked `NOT IMPLEMENTED YET` (Stage C module) |
| **Part Movements** | **0** | Stock movements tracked via direct line snapshots |
| **Work Order Photos** | **0** | Photo uploads stored in `Files` directory when attached |
| **Car Inspections** | **8** | 4 Finalized, 4 Draft revisions (including 3-page A4 PDFs/HTML) |
| **Car Odometer Logs** | **81** | Historical odometer logs captured upon work order entry |
| **Audit Log Entries** | **281** | Immutable logs for logins, creations, updates, backups |
| **Online Backups** | **31** | Verified `.db` snapshots in `C:\AutoFixTestData\Dummy_View\Backups` |
| **App Users** | **5** | 1 Admin (`admin`), 4 Customer portal test accounts |

---

## 2. Financial & Revenue Reconciliation

All calculations match to 2 decimal places with zero discrepancy between database queries and the live Admin Dashboard.

| Metric | Amount (EGP) | Calculation / Verification |
| :--- | :---: | :--- |
| **Total Invoiced** | **60,591.00** | $\sum \text{Subtotal } (56,600.00) + \text{VAT } 14\% (7,441.00) - \text{Discount } (3,450.00)$ |
| **Total Collected (Revenue)** | **54,440.00** | $\sum \text{InvoicePayments.Amount} = \text{Dashboard Month Revenue}$ |
| **Total Refunded** | **0.00** | Credit note / refund module not implemented yet |
| **Outstanding Receivables** | **6,151.00** | $\text{Total Invoiced } (60,591.00) - \text{Total Collected } (54,440.00)$ |

### Revenue per Month
| Month | Invoices Count | Total Invoiced (EGP) | Total Collected (EGP) | Outstanding (EGP) |
| :---: | :---: | :---: | :---: | :---: |
| **2026-10** | 71 | 60,591.00 | 54,440.00 | 6,151.00 |

### Gross Profit Calculation (from Cost Snapshots)
The database stores historical `UnitCost` and `UnitPrice` on every `WorkOrderLine`:
1. **Invoiced Work Order Lines Price (Subtotal):** `56,600.00 EGP`
2. **Invoiced Work Order Lines Cost Snapshot (COGS):** `26,710.00 EGP`
3. **Discounts Applied to Invoiced Orders:** `3,450.00 EGP`
4. **Net Revenue Before VAT:**  
   $$\text{Subtotal } (56,600.00) - \text{Discount } (3,450.00) = \mathbf{53,150.00\text{ EGP}}$$
5. **Gross Profit Before VAT:**  
   $$\text{Net Revenue } (53,150.00) - \text{Cost of Goods } (26,710.00) = \mathbf{26,440.00\text{ EGP}}$$
6. **Gross Profit Margin:**  
   $$\frac{26,440.00}{53,150.00} = \mathbf{49.75\%}$$

*(Note: If calculated before discounts, Gross Margin is $56,600.00 - 26,710.00 = \mathbf{29,890.00\text{ EGP}}$).*

---

## 3. Top 10 Customers by Spend

| # | Customer Name | Phone | Invoices | Total Spent (EGP) | Total Paid (EGP) | Balance (EGP) |
| :-: | :--- | :--- | :-: | :---: | :---: | :---: |
| 1 | **Ahmed Mahmoud Hassan** *(Seeded Hand-Calc 1)* | `01012345671` | 1 | 5,472.00 | 2,000.00 | 3,472.00 |
| 2 | **WorkOrder Test Customer** | `01084447468` | 1 | 2,679.00 | 1,339.50 | 1,339.50 |
| 3 | **WorkOrder Test Customer** | `01068772915` | 1 | 2,679.00 | 1,339.50 | 1,339.50 |
| 4 | **Mohamed Abdelaziz** *(Seeded Hand-Calc 2)* | `01123456782` | 1 | 1,140.00 | 1,140.00 | 0.00 |
| 5 | **Mahmoud El Sayed** | `01234567893` | 1 | 855.00 | 855.00 | 0.00 |
| 6 | **Tarek Omar** | `01155443325` | 1 | 855.00 | 855.00 | 0.00 |
| 7 | **Simulation Customer 1** | `01058397883` | 1 | 741.00 | 741.00 | 0.00 |
| 8 | **Simulation Customer 2** | `01041405418` | 1 | 741.00 | 741.00 | 0.00 |
| 9 | **Simulation Customer 2** | `01049931774` | 1 | 741.00 | 741.00 | 0.00 |
| 10 | **Simulation Customer 3** | `01022763957` | 1 | 741.00 | 741.00 | 0.00 |

---

## 4. Top Parts & Services by Usage

| Item / Description | Type | Qty Sold | Total Sales (EGP) |
| :--- | :---: | :---: | :---: |
| **Synthetic oil and filter** | Spare Part | 63 | 28,350.00 |
| **Periodic check and maintenance** | Labor / Service | 63 | 15,750.00 |
| **Consumable parts** | Spare Part | 4 | 1,800.00 |
| **General diagnostics & labor** | Labor / Service | 4 | 1,000.00 |
| **Original OEM spare parts and synthetic oil** | Spare Part | 1 | 2,750.00 |
| **Engine overhaul and transmission maintenance** | Labor / Service | 1 | 2,250.00 |
| **Oil filter and lubricant** | Spare Part | 1 | 350.00 |
| **Brake pad installation & inspection** | Workmanship | 1 | 750.00 |

---

## 5. Origin of Records (Seeded Dummy vs. QA Simulation vs. Test Agents)

| Category | Count | Date / Time Range | Notes |
| :--- | :---: | :--- | :--- |
| **Initial Seeded Dummy Data** | 10 Customers, 10 Cars, 6 Orders, 4 Invoices | `2026-10-12 15:49` | Populated via `Seed-DummyData.bat` with "VIP Customer" tags and hand-calculated scenarios. |
| **QA Simulation Engine** | 63 Customers, 63 Cars, 63 Orders, 63 Invoices | `2026-10-12 17:50` to `2026-10-13 01:36` | Generated by `Run-WorkdaySimulation.ps1` across 32 scheduled 15-minute business cycles. |
| **QA Test Suite Agents** | 22 Customers, 12 Cars, 6 Orders, 4 Invoices | `2026-10-12 17:49` and `2026-10-13 01:36` | Created during edge-case tests (lockout tests, rapid additions, isolation verification). |
| **Total in Database** | **95 Customers, 85 Cars, 75 Orders, 71 Invoices** | Full span: Oct 12–13, 2026 | All preserved with zero data deletion. |

---

## 6. Comparison with Baseline Snapshot (`C:\AutoFixTestData\Dummy_baseline`)

| Table Name | Baseline Rows (`Dummy_baseline`) | Current Rows (`Dummy_View`) | Delta ($\Delta$) | Invariant Status |
| :--- | :---: | :---: | :---: | :--- |
| **Customers** | 10 | 95 | **+85** | Monotonic Increase (Safe) |
| **Cars** | 10 | 85 | **+75** | Monotonic Increase (Safe) |
| **WorkOrders** | 6 | 75 | **+69** | Monotonic Increase (Safe) |
| **WorkOrderLines** | 14 | 148 | **+134** | Monotonic Increase (Safe) |
| **Invoices** | 4 | 71 | **+67** | Monotonic Increase (Safe) |
| **InvoicePayments** | 4 | 71 | **+67** | Monotonic Increase (Safe) |
| **CarInspections** | 4 | 8 | **+4** | Monotonic Increase (Safe) |
| **CarOdometerLogs** | 10 | 81 | **+71** | Monotonic Increase (Safe) |
| **AuditLogs** | 17 | 281 | **+264** | Monotonic Increase (Safe) |
| **AppUsers** | 1 | 5 | **+4** | Monotonic Increase (Safe) |
| **FormDrafts** | 0 | 2 | **+2** | Monotonic Increase (Safe) |
| **SpareParts** | 4 | 4 | **+0** | Constant |
| **Services** | 4 | 4 | **+0** | Constant |
| **Warehouses** | 1 | 1 | **+0** | Constant |
| **Mechanics** | 0 | 0 | **+0** | Constant (Stage C) |

---

## 7. Artifacts & Report File Paths

All reports and test data reside in strictly isolated folders outside production:

- **Consolidated QA Master Report:**  
  `d:\AutoFix\QA_REPORT.md`  
  `d:\AutoFix\QA\Reports\2026-10-13\QA_REPORT.md`
- **8-Hour Workday Simulation Report:**  
  `d:\AutoFix\WORKDAY_REPORT.md`  
  `d:\AutoFix\QA\Reports\2026-10-12\WORKDAY_REPORT.md`
- **Simulation Event Log:**  
  `d:\AutoFix\QA\SimulationLogs\2026-10-12\simulation.log`
- **Simulation State Checkpoint:**  
  `d:\AutoFix\QA\SimulationLogs\2026-10-12\checkpoint.json`
- **Inspection PDFs / HTML Files:**  
  `C:\AutoFixTestData\Dummy_View\Files\Inspections\`
- **Database Backup Snapshots (31 files):**  
  `C:\AutoFixTestData\Dummy_View\Backups\`
- **Untouched Original Test Data:**  
  `C:\AutoFixTestData\Dummy\`
- **Untouched Seeding Baseline Snapshot:**  
  `C:\AutoFixTestData\Dummy_baseline\`
