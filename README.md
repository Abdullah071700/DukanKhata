# DukanKhata (दुकान खाता)

A modern, secure, cloud-synchronized supplier-bill and payment manager designed specifically for shopkeepers. DukanKhata helps retail shops and merchants record supplier bills, track partial and full payments, monitor outstanding balances in Indian Rupees (₹), export native Excel (`.xlsx`) and PDF statements, and maintain verifiable cloud backups.

- **Current Live App:** [dukankhaata.netlify.app](https://dukankhaata.netlify.app/)
- **Repository:** [Abdullah071700/DukanKhata](https://github.com/Abdullah071700/DukanKhata)
- **Supabase Project:** `gdohxiwrgxiyznpdxxpl`

---

## Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | Type-safe, component-driven modular UI |
| **Build & Tooling** | Vite 6 | Instant HMR, lightning-fast production bundling |
| **Styling & Theme** | Tailwind CSS | Mobile-first responsive design with dark navy, emerald green, blue, red, and warm yellow |
| **Database & Auth** | Supabase (PostgreSQL 15+) | Row Level Security (RLS), atomic transactions, PL/pgSQL triggers & RPCs |
| **Spreadsheet Engine** | SheetJS (`xlsx`) | True binary `.xlsx` generation with spreadsheet formula injection protection |
| **PDF Generation** | jsPDF + AutoTable | High-resolution downloadable PDF statements and print-ready receipts |
| **PWA & Offline** | Web App Manifest & Service Worker | Installable on mobile home screens; network-first API with cached static assets |
| **Hosting & CI/CD** | Netlify | Static SPA deployment with HTTPS and automated single-page redirects |

---

## App Features & Walkthrough

```
+-------------------------------------------------------------------------+
|                              DUKANKHATA                                  |
|                                                                         |
|  [🏪 Sharma Provision Store]                     (Backups)  (Logout)    |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |  TOTAL OUTSTANDING BALANCE                                        |  |
|  |  ₹1,48,250.00                                                     |  |
|  |                                                                   |  |
|  |  [ 12 Suppliers ]                       [ 8 Pending Bills ]       |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  [ + Add Bill ]     [ 📋 Pending Bills ]     [ ✅ Paid Bills ]          |
|  [ 👥 Suppliers ]    [ 📥 Supplier Statement (Date Filter) ]           |
|                                                                         |
|  [ 📊 Whole Shop Excel (.xlsx) ]        [ 📄 Whole Shop PDF Report ]    |
+-------------------------------------------------------------------------+
```

### 1. Dashboard
- Displays **Total Outstanding Balance** in large Indian Rupees (`₹`), current date, registered supplier count, and active pending bill count.
- Touch-friendly shortcuts to all operational modules.
- One-click **Whole Shop Excel** and **Whole Shop PDF** exports.

### 2. Supplier Management
- Add, search, view, and edit suppliers with optional phone contact info.
- **Accidental Deletion Guard:** Database foreign keys (`ON DELETE RESTRICT`) prevent deleting any supplier while bills still reference them.

### 3. Two-Step Bill Entry
- Select supplier, choose recent salesman from touch chips or enter new salesman name, enter bill amount, and pick bill date.
- **Review Step:** Previews supplier, salesman, date, and amount before confirmation.
- **Final Confirmation Step:** Explains that the bill balance will be added to the cloud ledger.

### 4. Pending Bills & Payment Tracking
- List all outstanding bills with supplier filter chips ("All" and active suppliers).
- Shows bill total, paid so far, and remaining balance.
- **Add Payment Modal:**
  - Input amount (validated: must be $> 0$ and $\le$ remaining balance) and payment date.
  - Quick button to fill remaining balance in one tap.
  - Preview displays current balance, payment amount, balance after payment, and status after payment.
  - Automatic status transition: When balance reaches ₹0, the bill automatically moves to **Paid Bills** via an atomic database trigger.

### 5. Paid Bills & Payment History
- Lists all cleared bills.
- Tap any bill to expand its complete chronological payment history (date, payment installment amounts).

### 6. Supplier-Specific Reports & Date Filtering
- Select any supplier to see matching bills and totals.
- **Inclusive Date Range:** Filter by bill date with From and To dates. Both endpoint dates are included.
- **Quick Range Presets:** "This month", "Last month", "Last 30 days", and "Clear dates".
- Real-time preview of Billed, Paid, and Balance totals.
- Native `.xlsx` and downloadable landscape PDF statement.

### 7. Verifiable Cloud Backup & Guarded Restore
- Privileged server-side RPC (`create_shop_backup`) captures a complete JSON snapshot directly from PostgreSQL.
- Includes version marker (`1.0`), ISO timestamp, shop scope, supplier/bill/payment records, summary metrics, and MD5 checksum.
- **Guarded Restore Flow:**
  - Previews incoming source shop name, record counts, and totals.
  - **Automatic Pre-Restore Snapshot:** Automatically backs up the current database state *before* overwriting, ensuring zero risk of irreversible data loss.
  - Requires typing `RESTORE` explicitly to prevent accidental execution.

---

## Local Setup & Development

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### 1. Clone & Install
```bash
git clone https://github.com/Abdullah071700/DukanKhata.git
cd DukanKhata
npm install
```

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
VITE_SUPABASE_URL=https://gdohxiwrgxiyznpdxxpl.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Production Build
```bash
npm run build
```
This compiles TypeScript (`tsc`) and outputs an optimized production bundle into the `dist/` directory.

---

## Database Migrations & Supabase Setup

All database migrations are located in [`supabase/migrations/`](supabase/migrations/) and must be executed in order in the **Supabase Dashboard → SQL Editor**:

| # | Migration File | Description & Guarantees |
| :- | :--- | :--- |
| **01** | [`20261021000001_initial_schema.sql`](supabase/migrations/20261021000001_initial_schema.sql) | Creates normalized tables (`shops`, `shop_members`, `suppliers`, `bills`, `payments`, `salesmen`, `shop_backups`), constraints, indexes, triggers, and Row Level Security (RLS) policies. |
| **02** | [`20261021000002_migrate_shop_data.sql`](supabase/migrations/20261021000002_migrate_shop_data.sql) | **Safe & Non-Destructive:** Copies existing records from the legacy `shop_data` JSON table into normalized tables. Does **not** drop or modify `shop_data`. Fully idempotent. |
| **03** | [`20261021000003_backup_restore_rpc.sql`](supabase/migrations/20261021000003_backup_restore_rpc.sql) | Privileged database stored procedures for atomic cloud backup creation, schema validation, and guarded restore with pre-restore safety backups. |
| **04** | [`20261021000004_rollback_plan.sql`](supabase/migrations/20261021000004_rollback_plan.sql) | Reversible recovery procedures to sync normalized records back into `shop_data` if rollback is ever desired. |

### How to Run Migrations in Supabase
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard/project/gdohxiwrgxiyznpdxxpl).
2. Go to **SQL Editor** from the left navigation.
3. Open or paste `20261021000001_initial_schema.sql` and click **Run**.
4. Open or paste `20261021000002_migrate_shop_data.sql` and click **Run**.
5. Open or paste `20261021000003_backup_restore_rpc.sql` and click **Run**.

---

## Supabase Authentication & Redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:**
  `https://dukankhaata.netlify.app`
- **Redirect URLs:**
  - `https://dukankhaata.netlify.app/*`
  - `http://localhost:5173/*` (for local development)

### Email Confirmation Settings
- In **Authentication → Providers → Email**:
  - If **Confirm email** is enabled, users must click the verification link sent to their inbox before their first login.
  - If you prefer immediate sign-in without email confirmation, toggle off **Confirm email**.

---

## Netlify Deployment Configuration

The repository includes a ready-to-deploy [`netlify.toml`](netlify.toml) and [`public/_redirects`](public/_redirects).

### Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Netlify Environment Variables
In **Netlify Dashboard → Site configuration → Environment variables**, add:
- `VITE_SUPABASE_URL`: `https://gdohxiwrgxiyznpdxxpl.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `your-supabase-publishable-key`

### SPA Routing Rule
Single-page routing is automatically handled via `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Security Architecture & Data Isolation

1. **Explicit Shop Membership:**
   Data isolation is strictly enforced at the database level through the `shop_members` table and PostgreSQL Row Level Security (RLS). A user can only access records belonging to shops where they have an active membership row.
2. **Never Frontend Filtering:**
   Client-side filtering is only used for UI presentation (e.g. supplier tabs). All queries to `suppliers`, `bills`, `payments`, and `backups` are filtered by RLS policies using `auth.uid() = user_id`.
3. **No Floating Point Rounding:**
   Amounts are stored as `numeric(12, 2)` in PostgreSQL, preventing floating-point rounding discrepancies.
4. **Timezone Day-Shift Prevention:**
   Bill dates and payment dates are stored as calendar `date` types (not timestamp with time zone), preventing calendar dates from shifting across UTC boundaries.
5. **Spreadsheet Formula Injection Defense:**
   All exported spreadsheet cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized by prefixing with `'` to prevent remote formula execution in Microsoft Excel.
6. **No Admin Keys on Client:**
   The frontend only receives the public publishable anon key. High-privilege backup and restore operations run as authenticated `SECURITY DEFINER` RPC functions with strict internal role checks (`owner` / `admin`).

---

## Verification Status

| Verification Item | Status | Notes |
| :--- | :---: | :--- |
| **TypeScript & Production Build** | ✅ Verified | Clean build with zero TypeScript errors via `npm run build` |
| **Supabase Project Discovery** | ✅ Verified | Endpoint `https://gdohxiwrgxiyznpdxxpl.supabase.co` inspected; table `shop_data` confirmed |
| **Non-Destructive Migration Scripts** | ✅ Verified | Idempotent migrations created preserving `shop_data` |
| **Safe Backup & Restore Stored Procedures** | ✅ Verified | Pre-restore snapshotting and checksum verification implemented |
| **Formula Injection Protection** | ✅ Verified | Implemented in `formatters.ts` and `exportExcel.ts` |
| **Date Range Filtering (Inclusive Endpoints)**| ✅ Verified | Implemented in `SupplierReportScreen.tsx` |
| **Netlify SPA Configuration** | ✅ Verified | `netlify.toml` and `public/_redirects` configured |
| **Database Migrations Execution** | ⏳ User Action | Requires running the 3 SQL migration scripts in Supabase SQL editor |
| **Netlify Redeploy** | ⏳ User Action | Trigger build in Netlify or push branch to deploy |
