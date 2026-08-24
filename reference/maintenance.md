# Salon Website Maintenance

This is the recurring maintenance checklist for a salon owner after launch. The website remains useful when the visible content, Firebase services, reminder paths, and client configuration are kept current.

## Monthly maintenance

### 1. Service and price updates

Review every service, cosmetic product, description, price, duration, stylist, and category. Update `public/client-config.js` or the Admin Services tab when the salon changes its menu. Cosmetics must retain `orderOnly: true` so they continue to use WhatsApp instead of the appointment system.

### 2. Gallery and promotional content

Add recent work in the Admin Gallery tab, remove outdated styles, check image crops on mobile, and refresh featured or most-booked selections. Compress large uploads and confirm Cloudinary uploads still work.

### 3. Booking and calendar quality check

Create a test appointment, confirm the slot appears in the admin calendar, verify cancellation and rescheduling, and remove the test record according to the salon's data policy. Check that cosmetics never appear in the saved bookings list.

### 4. Reminder delivery review

Review booking records for `whatsappStatus`, `reminderSentAt`, `reminderTriedAt`, and `whatsappError`. Investigate failed messages and confirm the WhatsApp Cloud credentials, phone number ID, approved templates, and Functions deployment when automation is enabled.

### 5. Manual WhatsApp reminder fallback

When an automated reminder fails, open the booking in the Admin Bookings tab and choose **Send WhatsApp Reminder**. The website opens the owner's WhatsApp chat with the customer's name, service, price placeholder, date, time, and a ready-to-send message. The admin reviews the text and taps Send. This uses the normal WhatsApp app or WhatsApp Web and does not consume WhatsApp Cloud API message credits.

Manual reminders should be the operational fallback, not an unsolicited bulk-messaging system. The salon should only contact customers who supplied the number for appointment communication and should respect opt-out requests.

### 6. Account and security review

Check admin accounts, active status, roles, and permissions. Remove former staff accounts, confirm admin emails are verified, review suspicious login activity, and test the password reset flow. Do not share Firebase, Cloudinary, Resend, or WhatsApp secrets in the public website files.

### 7. Backup and recovery

Export or back up important booking, gallery, review, and client-content data according to the salon's retention policy. Confirm the Firebase project, hosting deployment, Functions deployment, and Cloudinary account can be recovered by the agreed owner contact.

### 8. Contact and legal content

Confirm the phone numbers, WhatsApp link, email addresses, address, map, opening hours, social links, Terms & Conditions, cancellation language, and product-order instructions. Update the gitignored `client-config.env` checklist whenever a new client configuration field is introduced.

### 9. Frontend health check

Test the homepage on a current desktop and mobile browser. Check the first-visit Terms modal, authentication verification flow, service tabs, cosmetics order flow, gallery lightbox, floating WhatsApp button, forms, admin sign-in, and back-to-top control. Review browser console errors and broken images.

### 10. Search and conversion review

Refresh homepage copy, gallery examples, SEO titles and descriptions, seasonal offers, and call-to-action links. Confirm that direct service WhatsApp messages contain the selected service name and displayed price.

## Optional quarterly work

- Review Firebase and Cloudinary usage, quotas, and billing.
- Rotate provider credentials when the provider recommends it or staff access changes.
- Review Firestore rules and Functions dependencies after Firebase upgrades.
- Audit accessibility, consent text, data retention, and customer communication practices.
- Run the automated test suite before a major content or infrastructure release.

## Suggested maintenance packages

Offer a monthly plan covering content updates, booking/reminder monitoring, gallery publishing, security review, backup checks, minor UI fixes, and one scheduled health report. Larger redesigns, new integrations, paid messaging credits, photography, copywriting, and emergency work should be quoted separately.
