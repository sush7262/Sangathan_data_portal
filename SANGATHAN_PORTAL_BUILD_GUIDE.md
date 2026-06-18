# Sangathan Data Portal — Full-Stack Build Guide

> **Purpose**: Ye file ek AI coding agent (Cursor, Claude Code, etc.) ke liye master context document hai.
> Naya session start karte time is file ko pehle paste karo taaki agent ko poora context mile.
> **Ek kaam ek baar** — ek task complete hone ke baad hi agla shuru karo.

---

## ⚠️ MANUAL STEPS (AI Agent inhe khud nahi kar sakta — tumhe karna hoga)

Ye cheezein **code likhne se pehle** tumhe manually complete karni hain:

### M1 — Supabase Project Banana
1. [supabase.com](https://supabase.com) pe jaao → **New Project** banao
2. Project name: `sangathan-portal`, region: Asia South (Mumbai) — closest to India
3. Password strong rakho aur **save karlo** (baad mein kaam aayega)
4. Project create hone ka wait karo (~2 min)

### M2 — Supabase Keys Copy Karo
Project create hone ke baad:
- **Settings → API** mein jaao
- Do cheezein copy karke safe jagah rakh lo:
  - `Project URL` → `https://xxxx.supabase.co`
  - `anon public` key → `eyJhbG...` (lamba token)
- Ye dono baad mein `.env` file mein jayenge

### M3 — Supabase Auth Settings
- **Authentication → Providers** mein jaao
- **Email** provider enable karo
- "Confirm email" toggle **OFF** karo (internal tool hai, confirmation ki zarurat nahi)
- "OTP expiry": 3600 seconds (1 hour) rakho

### M4 — Database Tables Banana (SQL Editor mein run karo)
Supabase dashboard → **SQL Editor** → New Query → ye SQL paste karke **Run** karo:

```sql
-- 1. Users/Access table
CREATE TABLE access_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'User')),
  vibhag TEXT NOT NULL DEFAULT 'सोलन',
  districts TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. District entries table
CREATE TABLE district_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  district TEXT NOT NULL UNIQUE,
  values JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'draft', 'submitted')),
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_access_updated BEFORE UPDATE ON access_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_entries_updated BEFORE UPDATE ON district_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Seed the 4 districts (initial empty entries)
INSERT INTO district_entries (district, values, status) VALUES
  ('सोलन', '{}', 'pending'),
  ('नालागढ़', '{}', 'pending'),
  ('हरिपुरधार', '{}', 'pending'),
  ('सिरमौर', '{}', 'pending');

-- 5. Seed the admin user (email se login hoga)
INSERT INTO access_master (email, role, vibhag, districts, status) VALUES
  ('admin@example.org', 'Admin', 'सोलन', ARRAY['सोलन','नालागढ़','हरिपुरधार','सिरमौर'], 'Active');
```

### M5 — Row Level Security (RLS) Setup
SQL Editor mein ye bhi run karo:

```sql
-- Enable RLS
ALTER TABLE access_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_entries ENABLE ROW LEVEL SECURITY;

-- Access master: authenticated users read kar sakte hain
CREATE POLICY "auth users can read access" ON access_master
  FOR SELECT TO authenticated USING (true);

-- Access master: sirf admin write kar sakta hai
CREATE POLICY "admin can write access" ON access_master
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM access_master WHERE email = auth.jwt() ->> 'email' AND role = 'Admin')
  );

-- District entries: authenticated users read/write kar sakte hain
CREATE POLICY "auth users can read entries" ON district_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth users can write entries" ON district_entries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth users can update entries" ON district_entries
  FOR UPDATE TO authenticated USING (true);
```

### M6 — .env File Banana (project folder mein)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

---

## Project Overview

**App**: Sangathan Data Portal — Solan Vibhag ke liye internal data entry portal.

**Abhi ki problem**: Poora app ek single HTML file mein hai. Data `localStorage` mein store hota hai — koi server, koi real login, koi shared database nahi.

**Goal**: 
1. HTML file ko organized files mein todna (HTML + CSS + JS alag)
2. `localStorage` calls ko Supabase API calls se replace karna
3. Login ko real (Supabase Auth OTP) se replace karna
4. Ek deployable full-stack app banana

---

## Current Architecture (Samajhne ke liye)

```
sangathan_data_portal.html  ← SARI DUNIYA YE EK FILE MEIN HAI
├── <style>                 ← CSS (~180 lines)
├── <script id="appdata">   ← JSON: sections schema + districts + Excel base64
└── <script>                ← JS logic (~420 lines)
    ├── DATA / SECTIONS / DISTRICTS (constants)
    ├── AUTO / AUTO_LABELS (auto-total formulas)
    ├── LS object           ← localStorage wrapper (REPLACE KARNA HAI)
    ├── ACCESS / ENTRIES    ← state vars from localStorage (REPLACE KARNA HAI)
    ├── S = {user, screen, district, sectionIdx, ctx}  ← app state
    ├── Screen functions:
    │   ├── loginScreen()
    │   ├── naLanding()     ← non-admin home
    │   ├── naForm()        ← data entry form (6 sections A-F)
    │   ├── naReview()      ← review before submit
    │   ├── naAck()         ← acknowledgement after submit
    │   ├── adDashboard()   ← admin overview
    │   ├── adEntries()     ← admin all entries table
    │   ├── adReports()     ← CSV/PDF/Excel exports
    │   └── adAccess()      ← user management
    ├── Action functions:
    │   ├── doLogin()       ← REPLACE with Supabase Auth
    │   ├── logout()        ← REPLACE with Supabase Auth
    │   ├── saveDraft()     ← REPLACE with Supabase DB
    │   ├── finalSubmit()   ← REPLACE with Supabase DB
    │   ├── unlock(d)       ← REPLACE with Supabase DB
    │   ├── addAccess()     ← REPLACE with Supabase DB
    │   └── removeAccess(i) ← REPLACE with Supabase DB
    └── render()            ← main router
```

---

## Target Architecture (Kya Banana Hai)

```
sangathan-portal/
├── index.html              ← shell only (3 divs + script tags)
├── style.css               ← extracted CSS (unchanged)
├── app-data.js             ← sections schema, districts, Excel b64, AUTO defs
├── supabase-client.js      ← Supabase init + all API functions
├── app.js                  ← main app logic (render, screen functions)
├── .env                    ← SUPABASE_URL + SUPABASE_ANON_KEY (gitignore mein)
└── .gitignore
```

---

## Supabase API Functions (supabase-client.js mein likhne hain)

```javascript
// Auth
supabaseLogin(email)        → OTP bhejta hai
supabaseVerifyOtp(email, token) → login confirm karta hai
supabaseLogout()            → logout
supabaseGetSession()        → current session check

// Access Master
fetchAccessRecord(email)    → us user ki info (role, districts)
fetchAllUsers()             → admin ke liye sab users
addUser(email, role, districts) → naya user add (admin only)
removeUser(email)           → user remove (admin only)

// District Entries
fetchEntry(district)        → ek district ka data
fetchAllEntries()           → sab districts ka data (admin)
upsertEntry(district, values, status) → save/update entry
submitEntry(district, values, submittedBy) → final submit
unlockEntry(district)       → admin unlock (status → 'draft')
```

---

## Task Breakdown

> **AI Agent ko instruction**: EK TASK EK BAAR. Task complete hone ke baad RUKO aur confirm karo. Har task ke baad "Current task" update karo.

### Phase 1 — File Split (No Logic Change)

#### T1.1 — CSS Extract
- `<style>` block ka poora content copy karke `style.css` mein daal do
- `index.html` mein `<link rel="stylesheet" href="style.css">` add karo
- Test karo: browser mein same dikhna chahiye

#### T1.2 — App Data Extract
- `<script id="appdata">` ka JSON aur sab constants (`DATA`, `SECTIONS`, `DISTRICTS`, `SHEET`, `DNAMES`, `ALLCOLS`, `AUTO`, `AUTO_LABELS`, `SECTION_AUTOS`) `app-data.js` mein daal do
- `index.html` mein `<script src="app-data.js">` add karo
- Test karo: app same kaam kare

#### T1.3 — Main JS Extract
- Baaki poora JS `app.js` mein daal do
- `index.html` ka final structure:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sangathan Data Portal — सोलन विभाग</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
    <link href="[google fonts url]" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <div id="app"></div>
    <div id="printArea"></div>
    <div class="toast" id="toast"></div>
    <script src="app-data.js"></script>
    <script src="app.js"></script>
  </body>
  </html>
  ```
- Test karo: localStorage wala app abhi bhi kaam kare (Supabase baad mein aayega)

---

### Phase 2 — Supabase Client Setup

#### T2.1 — Supabase Client File Banana
`supabase-client.js` banao with Supabase CDN:

```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'YAHAN_APNI_URL_DAALO';
const SUPABASE_ANON_KEY = 'YAHAN_APNI_KEY_DAALO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

> ⚠️ Note: Agar environment variables use karna chahte ho to simple bundler (Vite) setup karna hoga — usse pehle seedha hardcode karo, baad mein move karna.

Ye sab functions isi file mein likho (upar describe kiye hain):
- `supabaseLogin`, `supabaseVerifyOtp`, `supabaseLogout`, `supabaseGetSession`
- `fetchAccessRecord`, `fetchAllUsers`, `addUser`, `removeUser`
- `fetchEntry`, `fetchAllEntries`, `upsertEntry`, `submitEntry`, `unlockEntry`

`index.html` mein add karo (app-data.js ke baad, app.js se pehle):
```html
<script type="module" src="supabase-client.js"></script>
```

#### T2.2 — Session Check on Load
`app.js` mein `render()` call se pehle:
```javascript
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const rec = await fetchAccessRecord(session.user.email);
    if (rec) {
      S.user = rec;
      S.screen = rec.role === 'Admin' ? 'ad_dashboard' : 'na_landing';
      S.ctx = rec.role === 'Admin' ? 'admin' : 'user';
    }
  }
  render();
}
init();
```

---

### Phase 3 — Auth Replace

#### T3.1 — Login Screen OTP Flow
`loginScreen()` function mein change karo:

**Step 1 — Email enter karo**: existing UI same rahega
**Step 2 — OTP enter karo**: `doLogin()` call pe OTP bhejdo, ek nayi input dikhao

```javascript
async function doLogin() {
  const email = $('#email').value.trim().toLowerCase();
  // validation same rahega
  const { error } = await supabaseLogin(email);
  if (error) { showErr(error.message); return; }
  // OTP input screen dikhao
  showOtpScreen(email);
}

async function verifyOtp(email) {
  const token = $('#otp').value.trim();
  const { error } = await supabaseVerifyOtp(email, token);
  if (error) { showErr('OTP galat hai'); return; }
  const rec = await fetchAccessRecord(email);
  if (!rec || rec.status !== 'Active') { showErr('Access nahi hai'); return; }
  S.user = rec;
  S.screen = rec.role === 'Admin' ? 'ad_dashboard' : 'na_landing';
  S.ctx = rec.role === 'Admin' ? 'admin' : 'user';
  render();
}
```

> ⚠️ Demo "quick login" buttons (admin@example.org etc.) hata do — ab real OTP se login hoga.

#### T3.2 — Logout
```javascript
async function logout() {
  await supabaseLogout();
  S = { user: null, screen: 'login', district: null, sectionIdx: 0, ctx: 'user' };
  render();
}
```

---

### Phase 4 — Data Replace (localStorage → Supabase)

#### T4.1 — App Startup mein Data Load
`init()` function extend karo — login hone ke baad:
```javascript
// Sab districts ka data load karo
const allEntries = await fetchAllEntries();
ENTRIES = {};
allEntries.forEach(row => {
  ENTRIES[row.district] = {
    values: row.values,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at
  };
});
```

#### T4.2 — Save Draft
```javascript
async function saveDraft() {
  const e = entry(S.district);
  if (e.status !== 'submitted') {
    await upsertEntry(S.district, e.values, 'draft');
    e.status = 'draft';
  }
  toast('प्रारूप सेव हुआ', 'ok');
}
```

#### T4.3 — Final Submit
```javascript
async function finalSubmit() {
  const e = entry(S.district);
  const now = new Date().toISOString();
  await submitEntry(S.district, e.values, S.user.email);
  e.status = 'submitted';
  e.submittedBy = S.user.email;
  e.submittedAt = now;
  S.screen = 'na_ack';
  render();
}
```

#### T4.4 — Admin Unlock
```javascript
async function unlock(d) {
  await unlockEntry(d);
  entry(d).status = 'draft';
  toast(d + ' अनलॉक हुआ', 'ok');
  render();
}
```

#### T4.5 — Access Management
```javascript
async function addAccess() {
  // validation same rahega
  const { email, role, districts } = getFormValues();
  await addUser(email, role, districts);
  // local ACCESS array update karo bhi
  ACCESS.push({ email, role, districts, status: 'Active' });
  toast('Access सेव हुआ', 'ok');
  render();
}

async function removeAccess(email) {
  await removeUser(email);
  ACCESS = ACCESS.filter(a => a.email !== email);
  render();
}
```

> ⚠️ Note: `removeAccess` ka signature badlega — index ke bajaye email pass karo

#### T4.6 — LS Object Hata Do
`app.js` mein se ye puri object delete karo:
```javascript
const LS = { get(k,f){...}, set(k,v){...} };
```
Aur ye lines bhi:
```javascript
let ACCESS = LS.get('smk_access', [...]);
let ENTRIES = LS.get('smk_entries', {});
```
Replace with:
```javascript
let ACCESS = [];
let ENTRIES = {};
```
(Init function inhe load karega)

---

### Phase 5 — Admin Access List Load

#### T5.1 — Access List Fetch
`init()` mein admin login hone ke baad:
```javascript
if (rec.role === 'Admin') {
  ACCESS = await fetchAllUsers();
}
```

`adAccess()` screen refresh pe bhi fetch karo:
```javascript
async function adAccess() {
  ACCESS = await fetchAllUsers();
  // existing render logic same rahega
}
```

---

### Phase 6 — Polish & Deploy

#### T6.1 — Loading States
Supabase calls async hain — inke dauran UI block na ho:
- Login button pe: `<button disabled>Loading...</button>` dikhao
- Form save pe: toast "Saving..." dikhao
- Data load pe: spinner ya skeleton dikhao

#### T6.2 — Error Handling
Har async call ke aage try-catch:
```javascript
try {
  await supabaseLogin(email);
} catch (err) {
  toast('Network error: ' + err.message, 'err');
}
```

#### T6.3 — .gitignore
```
.env
node_modules/
```

#### T6.4 — Deploy (Vercel ya Netlify — Free)
Option A — **Netlify Drop** (sabse simple):
1. [netlify.com/drop](https://app.netlify.com/drop) pe jaao
2. Apna project folder drag-and-drop karo
3. Done — URL milega

Option B — **Vercel**:
```bash
npm install -g vercel
vercel
```

> ⚠️ Deploy se pehle `.env` values ko hosting platform ke Environment Variables mein daalo (Netlify/Vercel dono ka UI mein yeh option hota hai). File mein mat chhodo.

---

## Important Notes for Agent

1. **Excel Export** (`downloadExcel`) mein ExcelJS ka use hota hai — ye unchanged rehna chahiye. Supabase se data fetch hone ke baad same ExcelJS logic kaam karega.

2. **OTP vs Magic Link**: Supabase ka default OTP (6-digit code) email pe aata hai. Alternatively "Magic Link" bhi bhej sakte ho (ek click login). `signInWithOtp` dono support karta hai — `options.shouldCreateUser: false` rakho taaki sirf existing users login kar sakein.

3. **`removeAccess` function** ka signature badlega — pehle index tha, ab email hogi. HTML mein bhi onclick update karna hoga:
   - Pehle: `onclick="removeAccess(${i})"`
   - Baad mein: `onclick="removeAccess('${esc(a.email)}')"`

4. **`type="module"`** use karte ho to sab JS files `type="module"` chahiye. Ya phir Supabase ko global variable banao — simpler rehta hai is project ke liye.

5. **Auto-total formulas** (`AUTO` object) koi bhi change nahi aayega — ye sirf frontend calculation hai.

6. **ENTRIES object** ka structure same rehna chahiye:
   ```javascript
   ENTRIES['सोलन'] = {
     values: { D: '5', E: '3', ... },  // col → value map
     status: 'draft',
     submittedBy: 'user@example.org',
     submittedAt: '2025-01-01T10:00:00Z'
   }
   ```

---

## Current Status / Next Step

_(Har session ke baad update karo)_

**Last completed task**: Setup (Manual steps M1-M6 pending)
**Current task**: T1.1 — CSS Extract
**Notes**: Pehle manual steps M1-M6 complete karo, phir T1.1 shuru karo.

### Checklist
- [ ] M1 — Supabase project create
- [ ] M2 — Keys copy
- [ ] M3 — Auth settings
- [ ] M4 — Database tables + seed data
- [ ] M5 — RLS policies
- [ ] M6 — .env file
- [ ] T1.1 — CSS extract
- [ ] T1.2 — App data extract
- [ ] T1.3 — Main JS extract
- [ ] T2.1 — Supabase client file
- [ ] T2.2 — Session check on load
- [ ] T3.1 — OTP login flow
- [ ] T3.2 — Logout
- [ ] T4.1 — Data load on startup
- [ ] T4.2 — Save draft → Supabase
- [ ] T4.3 — Final submit → Supabase
- [ ] T4.4 — Admin unlock → Supabase
- [ ] T4.5 — Access management → Supabase
- [ ] T4.6 — Remove LS object
- [ ] T5.1 — Admin access list fetch
- [ ] T6.1 — Loading states
- [ ] T6.2 — Error handling
- [ ] T6.3 — .gitignore
- [ ] T6.4 — Deploy
