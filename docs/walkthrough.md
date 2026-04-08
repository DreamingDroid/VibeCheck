# Secure Organizer & Paid WhatsApp Broadcast Update

I've successfully implemented both of your requested features for the Organizer System without breaking existing flows. 

Here is exactly what changed across the repository:

## 1. Secure RSVP Lists
The data pipeline pulling RSVPs for the Organizer Dashboard has been decoupled from the Admin dashboard and heavily restricted.
- **Backend Protection:** A dedicated API (`/api/organizer/events/{id}/rsvps`) was added. It strictly queries the database and verifies the requester is the event owner *before* returning data. Crucially, it completely strips the user's `email` and `phone_number` payload. 
- **Frontend Clean Up:** The organizer guest list now displays just the User's Name. If the user never saved their name, it defaults to showing a clean `Anonymous Guest` badge instead of giving away data.

## 2. Paid WhatsApp Broadcasts
Next to your event guest lists on the dashboard, organizers now have access to a brand new `📢 WhatsApp Update` module.

- **Dynamic Cost Evaluation:** When opened, the platform silently calculates how many *eligible* attendees exist (users who specifically attached WhatsApp numbers to their web profile).  
- **Configurable Pricing:** The backend automatically reads a `whatsapp_broadcast_rate` key from the admin `system_settings` table (which can be edited at any time). As discussed, it defaults to **₹2 per message** to give you immediate functionality. The modal instantly spits out a `Total Cost (Attendees * ₹2)`.
- **Payment & Dispatch Engine:** A simulated Payment Gateway UI was built in. Upon clicking "Pay & Send", a beautiful "Processing Payment" state flashes, followed by a dispatch signal to the backend. The backend loops through all verified phone numbers and fires the `sendWhatsAppMessage` utility, prepending the event's name to the top of the context block for clarity!

> [!TIP]
> **Production Note:** The "Mock Payment" module runs entirely locally with a simulated 2-second timeout. Once you are ready to use a real processor like Razorpay, you can seamlessly drop the frontend component right into that flow without changing the backend logic!
