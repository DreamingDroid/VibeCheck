# Organizer Application Workflow

The new self-service Organizer Application and Verification System is fully integrated into the platform. We transitioned from manual admin authorization to an automated, secure public application funnel using Resend and PostgreSQL.

## Features Completed

### 1. Verification System (OTP)
- **Resend Integration**: Fully integrated `resend` to handle secure email delivery.
- **Unified Flow**: Both Email and Phone (WhatsApp) require a 6-digit verification code.
- **Security**: The pop-up validation requires standard 6-digit confirmation with a 10-minute expiry on the server-side, and an enforced 3-minute cooldown UI timer for requesting new codes. 

### 2. Organizer Application Portal (`/organizer/apply`)
- A visually rich, VibeCheck-styled application page allows new brands to apply.
- Collects:
  - Brand Name & Description
  - Instagram & Facebook links
  - Verified Email
  - Verified Phone (WhatsApp)
- Once both contact methods are verified through the modal interface, the user can submit the application.
- The application enters the database with a `pending_approval` status.

### 3. Admin Review Capabilities (`/admin`)
- The "Platform Guardians" widget in the admin dashboard has been upgraded to **Pending Organizer Requests**.
- Admins can review all pending brand applications natively inside the dashboard.
- Actions available:
  - **Approve**: Immediately transitions the applicant to 'approved' and fires a welcome email via Resend.
  - **Reject**: Triggers a modal for the admin to provide a specific rejection reason. The applicant is transitioned to 'rejected', and the exact reason is emailed to them directly.

### 4. Organizer Dashboard Access Control (`/organizer`)
- The Organizer Dashboard is now strictly protected.
- If an applicant tries to bypass the application, or attempts to log in while their status is 'pending_approval' or 'rejected', the system redirects them securely.

## Verification / Testing

### Start the Servers:
1. Make sure your local database is running.
2. Start the backend: `cd server && npm run dev`
3. Start the frontend: `cd web && npm run dev`

### Test Flow:
1. Open the application portal: [http://localhost:3500/organizer/apply](http://localhost:3500/organizer/apply)
2. Fill out the application and test the verification modales (OTP codes are printed to the backend terminal in Dev Mode if `RESEND_API_KEY` is the default dummy key).
3. Log in to your Admin Dashboard ([http://localhost:3500/admin](http://localhost:3500/admin)) as a verified admin.
4. Review the pending request list. 
5. Test the reject modal by entering a reason and clicking Confirm.

> [!TIP]
> Make sure to update the `RESEND_API_KEY` in your `.env` when moving to a production environment to ensure emails actively hit candidate inboxes.
