# Guide: Accessing UAT Database via pgAdmin on Coolify

This guide explains how to connect to the **VibeCheck UAT PostgreSQL Database** using **pgAdmin** hosted on Coolify.

---

## 1. Overview

Both **pgAdmin** and **PostgreSQL** run inside the Coolify internal Docker network (`VibeCheckSpace` / `uat` environment). Because they share this private network:
- pgAdmin connects directly to PostgreSQL using the **internal container hostname/service ID**.
- No public port exposure or SSH tunneling is required.

---

## 2. Step-by-Step Connection Instructions

### Step 1: Open pgAdmin Web Interface

1. Open your **Coolify Dashboard**.
2. Navigate to: `Projects / Spaces` &rarr; **`VibeCheckSpace`** &rarr; **`uat`** &rarr; **`pgAdmin-uat`**.
3. **Open the URL:**
   - Click the **Links** menu at the top-right (or the 🌐 globe icon next to `Running (healthy)` under *Compose resources*).
   - Alternatively, open your pgAdmin domain (e.g. `http://pgadmin-...sslip.io`).
4. **Login Credentials:**
   - In Coolify, under `pgAdmin-uat` &rarr; **Environment Variables**, check:
     - `PGADMIN_DEFAULT_EMAIL`
     - `PGADMIN_DEFAULT_PASSWORD`
   - Use these credentials to log in to the pgAdmin web UI.

---

### Step 2: Get PostgreSQL Connection Details

1. In Coolify, go back to the **`uat`** environment.
2. Click on the **PostgreSQL Database** resource.
3. Locate the **Internal Connection String / URL**, which looks like:
   ```text
   postgres://<username>:<password>@<internal_host>:5432/<database_name>
   ```
   *Example:*
   ```text
   postgres://postgres:paI2XvW...NO3DONITy8b5LcLUAwt3ArCs@xdhmxcaxkeevzo0zy3ggdzqh:5432/postgres
   ```

4. Break down the connection string into the 5 components:
   - **Host Name / Address**: `<internal_host>` (e.g., `xdhmxcaxkeevzo0zy3ggdzqh`)
   - **Port**: `5432`
   - **Maintenance Database**: `postgres` (or your configured database name)
   - **Username**: `postgres`
   - **Password**: `<password>`

---

### Step 3: Register the Database Server in pgAdmin

1. In pgAdmin, click **Add New Server** on the welcome dashboard (or right-click **Servers** in the left sidebar &rarr; **Register** &rarr; **Server...**).
2. Fill out the dialog:

#### General Tab:
- **Name**: `VibeCheck UAT DB` *(or any preferred label)*

#### Connection Tab:
- **Host name/address**: `<internal_host>` *(e.g., `xdhmxcaxkeevzo0zy3ggdzqh`)*
- **Port**: `5432`
- **Maintenance database**: `postgres`
- **Username**: `postgres`
- **Password**: `<your_db_password>`
- **Save password?**: ✅ **Yes** (Toggle on)

3. Click **Save**.

---

## 3. Running SQL Queries

Once connected:
1. In the left sidebar object tree, expand:
   - **Servers** &rarr; **VibeCheck UAT DB** &rarr; **Databases** &rarr; **`postgres`** (or target db).
2. Click **Tools** in the top menu &rarr; **Query Tool** (or press the query icon).
3. Type your SQL queries and click **Execute (▶ / F5)**.

### Common Administrative Tasks

#### Setting a User as SuperAdmin:
```sql
INSERT INTO admins (email, role, status)
VALUES ('user@example.com', 'SuperAdmin', 'approved')
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'SuperAdmin', 
    status = 'approved';
```

#### Verifying Admin Roles:
```sql
SELECT id, email, role, status, created_at 
FROM admins 
ORDER BY created_at DESC;
```

---

## 4. Troubleshooting & FAQ

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"could not translate host name"** | Pasted the full `postgres://...` URL into the Hostname field. | Only use the host portion (e.g., `xdhmxcaxkeevzo0zy3ggdzqh`). |
| **Connection Timed Out** | Using public IP / localhost instead of internal container name. | Ensure pgAdmin and Postgres are in the same Coolify environment and use the internal hostname. |
| **Password Authentication Failed** | Incorrect password or username. | Verify credentials in Coolify under the Postgres service **Environment Variables**. |
| **pgAdmin session logged out** | Browser cookie expired. | Re-login using `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD`. |
