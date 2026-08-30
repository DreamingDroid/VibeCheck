# Demographic Data Capture for VibeCheckSpace

We need to capture demographic details like "Profession" and "Age Group" along with the user's phone number during their profile setup. This data will eventually power an aggregate audience insights feature for event organizers.

## Proposed Changes

### Database Changes
Add two new columns to the `web_users` table:
- `profession VARCHAR(100)`
- `age_group VARCHAR(50)`

#### [MODIFY] [init.sql](file:///home/trivikramg/workspace/VibeCheck/db/init.sql)
- Update the `web_users` schema definition to include `profession` and `age_group`.
- I will execute an `ALTER TABLE` query via `psql` to apply these schema updates to the active database immediately.

---

### Backend API
#### [MODIFY] [users.ts](file:///home/trivikramg/workspace/VibeCheck/server/src/queries/users.ts)
- Update `getWebUserByEmail` to fetch `profession` and `age_group`.
- Update `upsertWebUser` to accept and store `profession` and `age_group`.
- Update `upsertUserPreferencesFromWeb` so that these properties sync to the `users` (WhatsApp) table's JSONB `preferences` field.

#### [MODIFY] [webPreferences.ts](file:///home/trivikramg/workspace/VibeCheck/server/src/webPreferences.ts)
- Update `saveWebUserHandler` to accept `profession` and `age_group` fields from the request body and pass them to the underlying query methods.

---

### Frontend Profile Setup
#### [MODIFY] [page.tsx (Preferences)](file:///home/trivikramg/workspace/VibeCheck/web/src/app/preferences/page.tsx)
- The Preferences page currently acts as the "Identity Matrix" where users submit their City and Phone Number. We will extend this layout to include input fields for **Profession** (e.g., Software Engineer, Designer) and **Age Group** (e.g., 18-24, 25-34).
- We will use visually pleasing inputs that match the vibrant "vibe" theme currently present on the page.
- Modify the state load and save mechanics to synchronize these fields with the backend.

## Verification Plan
1. Connect to the local and Neon databases to verify the table columns are successfully added.
2. Log into the application and visit the `/preferences` page.
3. Fill out the new Profession and Age Group fields and press save.
4. Verify the database accurately recorded the new values across both the `web_users` and `users` tables.
