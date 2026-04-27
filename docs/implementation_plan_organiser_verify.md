# Organizer Application & Verification Plan

This plan outlines the implementation of a full Organizer Application workflow. Instead of Admins manually adding Organizers, prospective Organizers will apply through a public portal. They must verify their email and phone number during the application process. Admins will review the pending requests and approve or reject them.

## Proposed Changes

### 1. Database Modifications

#### [MODIFY] `db/init.sql`
Add the following columns to the `admins` table to support the application lifecycle:
- `status VARCHAR(50) DEFAULT 'pending_approval'` (States: `pending_approval`, `approved`, `rejected`)
- `brand_name VARCHAR(255)`
- `description TEXT`
- `social_links JSONB` (to store Facebook/Instagram URLs)
- `phone_number VARCHAR(255) UNIQUE`
- `email_verified BOOLEAN DEFAULT false`
- `phone_verified BOOLEAN DEFAULT false`
- `rejection_reason TEXT`

*(A DB migration or `ALTER TABLE` query will be applied during backend startup to update the existing schema).*

---

### 2. Backend (`server`)

#### [NEW] Dependency Installation
- Install `resend` to send OTP emails and rejection notification emails.

#### [NEW] Application & Verification Endpoints (`server/src/organizer-apply.ts`)
- `POST /api/apply/send-otp`: Generates an OTP and sends it to the provided email (via Resend) or phone (via WhatsApp).
- `POST /api/apply/verify-otp`: Validates the entered OTP. If correct, returns a temporary verification token to the frontend.
- `POST /api/apply/submit`: Accepts the full application form (Brand, Description, Socials, Email, Phone) along with the verification tokens. Inserts a new row into `admins` with `role = 'organizer'` and `status = 'pending_approval'`.

#### [MODIFY] `server/src/admin.ts` & `server/src/queries/admins.ts`
- **Get Pending Applications**: `GET /api/admin/organizers/pending` to fetch organizers with `status = 'pending_approval'`.
- **Approve Application**: `POST /api/admin/organizers/:id/approve` changes status to `approved`.
- **Reject Application**: `POST /api/admin/organizers/:id/reject` accepts a `reason`, changes status to `rejected`, and uses Resend to email the organizer the rejection reason.

#### [MODIFY] `server/src/middleware` or Organizer Auth Check
- Ensure any endpoint protecting the Organizer Dashboard verifies that the user's `admins` record has `status = 'approved'`.

---

### 3. Frontend (`web`)

#### [NEW] `web/src/app/organizer/apply/page.tsx`
- Create a public-facing application form.
- **Fields**: Brand Name, Event Description, Facebook URL, Instagram URL, Email, Phone Number.
- **Verification Flow**:
  - Add a "Verify" button next to the Email and Phone Number fields.
  - Clicking "Verify" triggers the OTP generation API and opens a modal/pop-up to enter the code.
  - Inside the pop-up, include a 3-minute countdown timer. If the code is not received within 3 minutes, display a "Resend Verification Code" button to re-trigger the OTP.
  - The form can only be submitted once both the Email and Phone show as "Verified".

#### [MODIFY] `web/src/app/admin/page.tsx`
- **Platform Guardians Section Updates**:
  - Replace the current "Assign Vibe Guardian (email)" input with a "Pending Organizer Requests" section.
  - Display the applicant's Brand Name, Description, Social Links, Email, and Phone.
  - Add **Approve** and **Reject** buttons for each request.
  - If "Reject" is clicked, open a pop-up modal to enter the `reason` before submitting the rejection.

#### [MODIFY] `web/src/app/organizer/page.tsx` (or layout)
- Block access to the Organizer Dashboard if the logged-in user is not in the `approved` status. Show a "Pending Approval" or "Application Rejected" screen instead.

## Verification Plan

### Manual Verification
1. **Application Submission**: Visit `/organizer/apply`, fill out the form, verify email and phone using the pop-ups, and submit.
2. **Dashboard Lockout**: Attempt to log in to `/organizer` as the applicant and ensure access is blocked with a "Pending Approval" message.
3. **Admin Review**: Log into the `/admin` dashboard, view the pending request, and ensure all brand/social details are visible.
4. **Rejection Flow**: Reject an application with a reason. Verify the database updates, and an email is dispatched via Resend containing the exact reason.
5. **Approval Flow**: Submit another application and approve it. Ensure the applicant can now access the `/organizer` dashboard fully.
