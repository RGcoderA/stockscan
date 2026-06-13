# StockScan – Free Inventory Scanner

A fully free, mobile-friendly inventory management app with QR/barcode scanning.
Scans barcodes with your phone camera → instantly updates your database.

**Stack:** React + Vite · Supabase (DB + Auth) · Netlify (Hosting)
**Cost:** $0 — all services used are on their free tiers.

---

## Features

- 📷 **Camera scanner** — scans QR codes & barcodes directly in the browser
- ✅ **One-tap checkout** — reduces stock by 1 with confirmation
- 📦 **Inventory view** — live stock levels with low-stock alerts
- ⚙️ **Admin panel** — add items, remove items, adjust stock +/−
- 🔐 **Secure auth** — Supabase email/password login
- ⚡ **Real-time sync** — stock updates instantly across all devices
- 📱 **Mobile-first** — designed for phone use in the field

---

## Step 1 – Set Up Supabase (5 minutes)

1. Go to **https://supabase.com** and create a free account
2. Click **New Project** → give it a name → set a database password → **Create**
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** (left sidebar) → click **New query**
5. Paste the entire contents of `supabase-setup.sql` and click **Run**
   - This creates the `inventory` table, security rules, and your starter data
6. Go to **Database → Replication → Tables** and toggle **ON** for `inventory`
   - This enables real-time stock sync across devices

**Create your admin user:**
1. Go to **Authentication → Users → Add user**
2. Enter your email and a strong password
3. Click **Create user** — this is the account you'll log in with

**Get your API keys:**
1. Go to **Project Settings → API**
2. Copy **Project URL** and **anon public** key — you'll need these next

---

## Step 2 – Deploy to Netlify (5 minutes)

### Option A — GitHub (recommended, enables auto-deploy)

1. Push this folder to a new GitHub repository
2. Go to **https://netlify.com** → **Add new site → Import an existing project**
3. Connect GitHub and select your repository
4. Netlify auto-detects Vite — leave build settings as-is
5. Go to **Site configuration → Environment variables → Add variable** and add:
   ```
   VITE_SUPABASE_URL      = https://ustpytcfzhpsyctirxpu.supabase.co/rest/v1/
   VITE_SUPABASE_ANON_KEY = sb_publishable_gjh4NWcBoTFAaqBP0_NC3w_GPATqHRW
   ```
6. Click **Deploy site** — your app is live in ~1 minute!

### Option B — Drag & Drop (fastest)

1. In this project folder, run:
   ```bash
   npm install
   npm run build
   ```
2. This creates a `dist/` folder
3. Drag the `dist/` folder onto **https://netlify.com/drop**
4. Add environment variables in **Site configuration → Environment variables**
5. Trigger a redeploy

---

## Step 3 – Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your Supabase values
cp .env.example .env

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## How to Use

### Scanning Items (on your phone)
1. Open your Netlify URL on your phone
2. Log in with the admin email/password you created in Supabase
3. Tap **📷 Open Camera Scanner**
4. Allow camera access when prompted
5. Point the camera at a barcode — it detects it automatically
6. Review the item and tap **✓ Confirm Checkout −1**

### Manual Barcode Entry
Type a barcode (e.g. `SOC-001`) in the **Manual Barcode Entry** field and tap **Find**.

### Admin Panel
- **Add items** — tap "Add Item" to add new products with a barcode and emoji
- **Adjust stock** — use **+** / **−** buttons or **Set** to enter an exact number
- **Remove items** — tap **Remove** to delete a product entirely

---

## Adding More Items

In the app's Admin panel, tap **Add Item** and fill in:
- **Product Name** — e.g. "Tennis Racket"
- **Barcode ID** — must match the physical barcode you'll scan, e.g. `TEN-001`
- **Initial Stock** — starting quantity
- **Category** — e.g. "Sports Equipment"
- **Emoji Icon** — e.g. 🎾

Or add directly in Supabase via the Table Editor.

---

## Generating QR Codes for Your Items

If your items don't have barcodes, generate free QR codes:
1. Go to **https://qr.io** or **https://www.qr-code-generator.com**
2. Enter the barcode value (e.g. `SOC-001`)
3. Download and print the QR code
4. Attach it to the item

The app's scanner reads both QR codes and standard barcodes (EAN-13, UPC-A, Code128, etc.)

---

## Project Structure

```
stockscan/
├── src/
│   ├── App.jsx          ← Complete app (auth, scanner, inventory, admin)
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Global reset styles
├── index.html           ← HTML shell
├── vite.config.js       ← Vite config
├── netlify.toml         ← Netlify build + redirect config
├── supabase-setup.sql   ← Run this in Supabase SQL Editor first
├── .env.example         ← Copy to .env and fill in your keys
└── package.json
```

---

## Free Tier Limits

| Service  | Free Limit | Notes |
|----------|-----------|-------|
| Netlify  | 100 GB bandwidth/month | More than enough for an inventory app |
| Supabase | 500 MB database, 50k MAU | Plenty for small-medium inventory |
| Supabase | 2 GB file storage | Not used by this app |

---

## Troubleshooting

**Camera won't open** — Make sure the site is served over HTTPS (Netlify handles this). Camera API requires a secure context.

**"Item Not Found" after scanning** — The scanned barcode text must exactly match what's stored in the `barcode` column. Check for spaces or formatting differences.

**Login fails** — Double-check you created the user in **Supabase → Authentication → Users**, not just in the database. The auth system is separate.

**Stock not updating in real-time** — Confirm you enabled real-time for the `inventory` table in **Supabase → Database → Replication**.
