# 🌲 TimberBooks — Mobile GST Billing & Accounting ERP

**TimberBooks** is a full-stack mobile GST billing and double-entry accounting application built for sawmills, timber depots, firewood merchants, and wood trading businesses. It provides a modern mobile replica of traditional Windows desktop timber ERPs, incorporating timber-specific measurements (CFT ↔ CBM conversions, piece dimensions, drum tonnage), automated GST calculations, and automatic double-entry journal postings.

Sample company seeded for demo and testing: **"Bhavani Timbers"** (Pollachi, Tamil Nadu).

---

## 🎨 Design System
- **Theme**: Strict two-colour palette:
  - **Primary**: Deep Navy (`#102A43` / `#0B1D30`) for headers, bottom tab bar, and primary actions.
  - **Accent**: Gold / Amber (`#D4A017` / `#B7791F`) for totals, active states, status highlights, and callouts.
  - **Neutrals**: Crisp white (`#FFFFFF`) and slate grey (`#486581`, `#829AB1`).
- **Touch Ergonomics**: All interactive elements have large touch targets (minimum 44px up to 72px) suited for sawmill and timber yard operations.

---

## 📱 Features & Screen Overview

1. **Owner Authentication (`LoginScreen` & `PinLockScreen`)**:
   - Single owner login via JWT; no self-registration or multi-user confusion.
   - Quick 4-digit biometric/PIN unlock on app resume.
2. **First-Time Setup (`FirstTimeSetupScreen`)**:
   - Appears automatically if no company or owner account exists.
   - Configures Company Profile (GSTIN, State code, PAN, Bank Details) and Financial Year.
3. **Dashboard (`DashboardScreen`)**:
   - Live KPI cards: Today's Sales, Liquid Cash & Bank, Receivables (Debtors), Payables (Creditors).
   - Tappable tiles organized into **Entry**, **Reports**, and **Masters** groups.
   - Floating `+` action button for quick bill entry.
4. **GST Bill / Invoice Entry (`BillEntryScreen`)**:
   - **Bill Type Switcher**: `Size (Cut Planks)` | `Drum / Firewood` | `Normal`.
   - **Timber Dimension Calculator**: Pieces × Thickness (in) × Width (in) × Length (ft) $\rightarrow$ auto CFT & CBM.
   - **Rate Conversion**: Switch between Rate per CFT and Rate per CBM ($1 \text{ CBM} = 35.3147 \text{ CFT}$).
   - **Auto GST**: Automatic intra-state (CGST 9% + SGST 9%) vs inter-state (IGST 18%) split.
   - **Round Off**: Auto nearest-rupee round-off.
   - **Extra Details**: Vehicle No, Driver, Transporter, LR No, Freight Note.
5. **Tax Invoice Preview & PDF (`InvoicePreviewScreen`)**:
   - Standard GST Tax Invoice layout with Original/Duplicate marker, Bank details, and Signatory.
   - One-tap WhatsApp statement share and server-side PDF generation.
6. **Purchase Entry (`PurchaseEntryScreen`)**:
   - Inward timber stock tracking, supplier invoice reference, and automatic stock increment.
7. **Unified Voucher Entry (`VoucherEntryScreen`)**:
   - Type switcher: `Receipt` (inflow from customer) | `Payment` (outflow to supplier/expense) | `Contra` (bank/cash transfer).
   - Quick denomination chips (+₹5K, +₹10K, +₹25K, +₹50K, +₹1L).
   - Real-time double-entry posting preview.
8. **Financial Reports**:
   - **Ledger Statement (`LedgerReportScreen`)**: Running statement with Opening Balance, debits, credits, and running balance with WhatsApp share.
   - **Cash Book (`CashBookScreen`)**: Daily cash register with inflows, outflows, and running cash in hand.
   - **Outstanding (`OutstandingScreen`)**: Receivables and Payables tabs with one-tap WhatsApp reminders and direct calling.
    - **Sales Register & Purchase Register**: Detailed GST audit reports.
9. **Masters**:
   - **Ledger Master (`LedgerListScreen`, `LedgerFormScreen`)**: Parties with 15-char GSTIN format validation, credit days, credit limits, and full 16 Indian chart of accounts groups.
   - **Item Master (`ItemListScreen`, `ItemFormScreen`)**: Timber species (Teak, Sal, Silver Oak, Casuarina), live stock levels, and low-stock alerts.
10. **Data Safety (`SettingsScreen`, `BackupRestoreScreen`)**:
    - Complete JSON database export/dump and import restoration.
11. **Financial Year Switcher (`FinancialYearScreen`)**:
    - Cloud-based multi-year accounting; switch active years with 1 tap without losing historical invoices or ledgers.
12. **Multi-Language (i18n)**:
    - Instant reactive switching between English, Hindi (हिंदी), and Gujarati (ગુજરાતી).

---

## 📐 Timber Math Reference

1. **CFT Formula for Sawn Timber Sizes**:
   $$\text{CFT per piece} = \frac{\text{Thickness (inches)} \times \text{Width (inches)} \times \text{Length (feet)}}{12}$$
   $$\text{Total CFT} = \text{CFT per piece} \times \text{Pieces}$$
2. **Quarter-Girth (Hoppus) Formula for Core Wood & Round Logs**:
   $$\text{CFT per log} = \left(\frac{\text{Girth (inches)}}{4}\right)^2 \times \frac{\text{Length (feet)}}{144}$$
   $$\text{Total CFT} = \text{CFT per log} \times \text{Pieces}$$
3. **CFT to CBM Conversion**:
   $$\text{CBM} = \frac{\text{CFT}}{35.3147}$$
4. **Rate Conversions**:
   $$\text{Rate per CBM} = \text{Rate per CFT} \times 35.3147$$
5. **GST Tax Logic**:
   - Local: $\text{CGST} = \frac{\text{Tax}\%}{2}, \quad \text{SGST} = \frac{\text{Tax}\%}{2}, \quad \text{IGST} = 0$
   - Interstate: $\text{CGST} = 0, \quad \text{SGST} = 0, \quad \text{IGST} = \text{Tax}\%$

---

## 🚀 Quick Start Instructions

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Backend Setup & Run
```bash
cd backend

# Install dependencies
npm install

# Seed demo data for Bhavani Timbers
npm run seed

# Run backend test suite (unit + integration tests)
npm test

# Start backend server
npm start
```
*Note: The backend automatically uses the embedded persistent storage (`backend/data/db.json`) if `MONGODB_URI` is left blank in `.env`. To connect to an external MongoDB instance or Atlas, set `MONGODB_URI` in `.env`.*

The API runs at `http://localhost:5000` (Health check: `http://localhost:5000/health`).

### 2. Available Ways to Run TimberBooks

TimberBooks can be run in 6 different ways depending on your workflow:

#### ⚡ Way 1: Instant Single-Port Browser App (Fastest & Zero Setup)
The backend server serves both the REST API and the compiled TimberBooks web application from a single port:
- Double-click **`start-browser.bat`** (or simply visit [http://localhost:5000/](http://localhost:5000/) when the backend is running).
- No Expo bundler, no second terminal window, zero wait time.

#### 🚀 Way 2: One-Click Dual Desktop Launcher
- Double-click **`start-all.bat`** in the project root.
- Automatically launches both the Backend API server (Port 5000) and the Expo Mobile Bundler in separate terminal windows.

#### 🌐 Way 3: Expo Web Dev Server with Live Reload
- Double-click **`start-web.bat`** or run:
  ```bash
  npm run mobile:web
  ```
- Starts the Metro web bundler with instant hot-module replacement on `http://localhost:8081`.

#### 📱 Way 4: Physical Phone via Expo Go Tunnel (Any Network)
- Double-click **`start-tunnel.bat`** or run:
  ```bash
  cd mobile
  npx expo start --tunnel
  ```
- Generates an Expo QR code that works across **cellular data or any Wi-Fi network** without configuring firewall or local IP addresses. Scan with the free **Expo Go** app on Android or iOS.

#### 🤖 Way 5: Local Wi-Fi or Android Emulator
- Run:
  ```bash
  npm run mobile
  ```
- Press `a` to open in Android Emulator (auto-configured to route to `http://10.0.2.2:5000/api`).
- Press `w` to switch to web preview.

#### 📦 Way 6: Standalone Android APK (No Expo Go Needed)
- Build a production standalone `.apk` for sawmills and depots:
  ```bash
  cd mobile
  npx eas-cli build -p android --profile preview
  ```

---

## 🔑 Demo Credentials (Bhavani Timbers)

| Field | Value |
| :--- | :--- |
| **Company** | Bhavani Timbers |
| **Location** | Pollachi, Coimbatore, Tamil Nadu (GSTIN: 33AAAAA1234A1Z5) |
| **Username** | `owner` |
| **Password** | `bhavani123` |
| **Quick PIN** | `1234` |
| **Financial Year** | FY 2024-25 |

---

## 🧪 Automated Test Verification

Run all test suites:
```bash
# In backend/
npm test
```
- **Unit Tests**: Verifies CFT calculations, CBM conversions, rate formulas, GST tax splits, and Indian Rupee amount-in-words.
- **Integration Tests**: Tests all 15 REST endpoints including single owner authentication, biometric PIN validation, invoice generation in Size mode, automatic double-entry ledger balance updates, cash book, and full JSON database backup.
