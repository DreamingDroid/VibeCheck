# VibeCheck Backend — Hostinger & Coolify Deployment Guide

This guide details the exact configurations to deploy this server on your Hostinger KVM VPS.

## Step 1: Connect to Your VPS and Install Coolify
Log into your VPS via SSH and install Coolify:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Once installed, open your browser and navigate to `http://<vps-ip>:8000` to set up your admin account.

---

## Step 2: Create a PostgreSQL Database
1. Inside the Coolify UI, go to **Resources** -> **New Resource** -> **PostgreSQL**.
2. Name the database `vibecheck_prod`.
3. Save the resource. Coolify will provision a Dockerized Postgres DB and generate a secure internal URL.

---

## Step 3: Create the API Service
1. Go to **Resources** -> **New Resource** -> **Git Repository (GitHub)**.
2. Select your repository.
3. Configure the following build settings:
   - **Base Directory**: `server`
   - **Build Pack**: `Dockerfile` (Coolify will automatically run the multi-stage build defined in `server/Dockerfile`).
4. Set the **Destination Domain** to your API address (e.g., `https://api.yourdomain.com`).

---

## Step 4: Configure Environment Variables
In the **Environment Variables** tab of your API service in Coolify, add the following production values:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | The port exposed by the runner container. |
| `NODE_ENV` | `production` | Enables production optimizations. |
| `DATABASE_URL` | `postgresql://postgres:<password>@<db-host>:5432/vibecheck_prod` | Use the internal database connection string provided by Coolify. |
| `RUN_MODE` | `cloud` | Instructs the server to use Gemini Flash (saves VPS memory). |
| `GEMINI_API_KEY` | `your_google_gemini_api_key` | Google Cloud Gemini API key. |
| `WHATSAPP_PHONE_NUMBER_ID` | `your_phone_number_id` | Twilio / Meta WhatsApp ID. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `your_account_id` | Twilio / Meta Business ID. |
| `WHATSAPP_ACCESS_TOKEN` | `your_permanent_token` | Twilio / Meta Access Token. |
| `WHATSAPP_VERIFY_TOKEN` | `your_verify_token` | Custom webhook token. |

Click **Deploy**! Coolify will compile, build, and deploy the backend with automated Let's Encrypt SSL certificate provisioning.
