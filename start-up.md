# VibeCheck Local Development Start-Up Guide

This guide contains the exact steps to safely boot up your entire application (Database, Node backend, and Tunnel) to successfully receive live WhatsApp texts right onto your laptop for quick local development.

## Step 1: Start the Database (PgVector / LangGraph)
1. Make sure the **Docker Desktop** application is officially open and running on your PC (wait for the whale icon to turn green).
2. Open a terminal in the root `VibeCheck` folder and spin up your databases:
   ```powershell
   docker-compose up -d
   ```

## Step 2: Start the Node Backend
1. Open a terminal and navigate strictly into your backend `server` folder:
   ```powershell
   cd server
   ```
2. Start the Express application (which compiles and caches via `ts-node`):
   ```powershell
   npm run dev
   ```

## Step 3: Start the Anti-Phishing Tunnel
1. Open a **completely new terminal tab** (do NOT close or kill your running backend).
2. Run our anti-phishing proxy command to punch an unblocked hole to the internet:
   ```powershell
   npx tunnelmole 3000
   ```
3. Highlight and copy the newly generated `https` URL (it will look like `https://random-words.tunnelmole.net`).

## Step 4: Validate the Webhook in Meta
1. Go to the Meta Developer Dashboard -> WhatsApp -> API Setup -> Configuration.
2. In the **Callback URL** field, paste your new Tunnelmole URL, and manually attach `/webhook` to the absolute end of it.
   *(Example: `https://random-words.tunnelmole.net/webhook`)*
3. In the **Verify Token** box, type exactly what matches your `.env` file (e.g., `vv2026`).
4. Click **Verify and Save**.

**You are now fully connected!** You can open your phone, text your assigned Meta Test Number, and watch your Express code instantly query your PgVector database!
