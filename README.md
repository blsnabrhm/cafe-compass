# ☕ Café Compass (AI Third-Place Experience)

**Café Compass** is an intelligent, multi-agent third-place café web application deployed on **Google Cloud Run**, powered by **Next.js 14 (App Router)** and the **Gemini 2.5 API**.

Designed around the **"Luminous Glass"** aesthetic (deep slate canvas, frosted glassmorphism, fluid aurora glowing light, and micro-interactions), Café Compass bridges acoustic comfort, voluntary community connection, and live floor operations through three complementary personas.

---

## 🎭 The Tri-Persona Architecture

```
                       ┌─────────────────────────┐
                       │   Café Compass Engine   │
                       └────────────┬────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
   Maya (Deep Work)          Leo (Open Table)           Sam (Intelligence)
• Acoustic Seat Locator    • 100% Opt-In Serendipity  • Autonomous Floor Feed
• Real-Time Sound Floor    • Contextual Icebreakers   • Live Acoustic Sliders
• Sensory Drink Pairing    • Zero-Intrusion Cloak     • Queue & Noise Forecast
```

1. **Maya (Focus Sanctuary)**:
   - Matches a customer's cognitive intention (e.g., *"2 hours deep coding sprint"*) to specific café sectors using real-time decibel sensors and seat availability.
   - Recommends sensory coffee pairings and estimated queue wait times.
   - Includes **Stealth Focus Cloaking**, mathematically shielding quiet workers from social discovery.

2. **Leo (Open Table Pods)**:
   - Facilitates voluntary connection among opted-in patrons over shared passion tags (`#GenerativeUI`, `#SpecialtyCoffee`, `#IndieSaaS`).
   - Gemini generates low-friction, authentic icebreaker questions with zero awkwardness.
   - Focus-mode patrons remain completely invisible to table discovery.

3. **Sam (Staff Intelligence Console)**:
   - Real-time operational command center for shift leads and baristas.
   - Gemini autonomously surfaces proactive operational directives (e.g., *elevated chatter in Zone A → dampens music by -3 dB*, *morning queue surge incoming → pre-heats espresso group*).
   - Zone atmosphere grid with live sound-level meters, environmental readouts, and interactive audio volume sliders.

---

## ⚡ Multi-Key Resilience Layer (`tenacity` style)

To ensure zero rate-limit contention (429 errors) across concurrent patrons and floor staff, Café Compass features an enterprise-grade multi-key routing and backoff layer in `lib/gemini.ts`:

1. **Per-Persona API Routing**:
   - `GEMINI_API_KEY_MAYA` → Allocated for Customer Seating & Pairings.
   - `GEMINI_API_KEY_LEO` → Allocated for Open Table Icebreaker Sparks.
   - `GEMINI_API_KEY_SAM` → Allocated for Staff Autonomous Directives.
   - `GEMINI_API_KEY` → Universal fallback key.

2. **Exponential Backoff**:
   - When Gemini returns `429` (Quota / Rate Exceeded) or `503` (Service Unavailable), the engine executes an exponential retry ladder:
     $$\text{delays} = [4\text{s}, 8\text{s}, 16\text{s}, 32\text{s}, 64\text{s}]$$
   - Maximum 5 attempts with full logging and graceful fallback to domain-calibrated default values if quotas are exhausted.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ or 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- A Google Cloud project with Firestore `(default)` enabled

### 1. Clone & Install
```bash
git clone https://github.com/your-username/cafe-compass.git
cd cafecompanion
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```
```env
GEMINI_API_KEY=AIzaSy...
# Optional per-persona keys for dedicated rate-limit pools:
GEMINI_API_KEY_MAYA=...
GEMINI_API_KEY_LEO=...
GEMINI_API_KEY_SAM=...
STAFF_PIN=1984
GCP_PROJECT_ID=your-gcp-project-id
```

### 3. Authenticate with Google Cloud (Firestore)
Either place your GCP service-account JSON at the project root as `service-account.json`, or authenticate with the CLI:
```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id
```

### 4. Seed the Firestore Database
Run once to populate menu items, zones, pods, and the initial order queue:
```bash
node scripts/seed-firestore.js your-gcp-project-id
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## ☁️ Google Cloud Deployment (Cloud Run)

Deployment is fully automated via the included scripts. Each script:
- Enables required GCP APIs
- Grants IAM roles (Secret Manager, Storage, Cloud Build, Firestore) to the Compute Service Account
- Builds and pushes the container image via Cloud Build
- Detects pre-configured secrets in Secret Manager and mounts them automatically
- Deploys to Cloud Run in the specified region

### Linux / macOS
```bash
chmod +x deploy.sh
./deploy.sh <YOUR_GCP_PROJECT_ID> [REGION]
# Region defaults to us-central1 if omitted
```

### Windows (PowerShell)
```powershell
.\deploy.ps1 -ProjectId <YOUR_GCP_PROJECT_ID> [-Region <REGION>]
# Region defaults to us-central1 if omitted
```

### Pre-loading Secrets (Optional but Recommended)
Store your Gemini API keys and Staff PIN in Secret Manager before deploying so the script picks them up automatically:
```bash
echo -n "YOUR_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=- --project <PROJECT_ID>
echo -n "YOUR_KEY" | gcloud secrets create GEMINI_API_KEY_MAYA --data-file=- --project <PROJECT_ID>
echo -n "YOUR_KEY" | gcloud secrets create GEMINI_API_KEY_LEO --data-file=- --project <PROJECT_ID>
echo -n "YOUR_KEY" | gcloud secrets create GEMINI_API_KEY_SAM --data-file=- --project <PROJECT_ID>
echo -n "1984"     | gcloud secrets create STAFF_PIN --data-file=- --project <PROJECT_ID>
```

---

## 📡 Live Telemetry & Simulation

Café Compass includes a built-in real-time simulator streaming via **Server-Sent Events (SSE)** at `/api/stream`:
- Sound sensor fluctuations across 4 zones
- Live queue depth changes
- Customer micro-touchpoint feeds
- Barista action broadcasts

You can manually trigger simulated sensor ticks anytime by calling:
```bash
curl -X POST http://localhost:3000/api/sim/tick
```
Or clicking **"Trigger Tick"** inside the Persona Simulator on the home page.
