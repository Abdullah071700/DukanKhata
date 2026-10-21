# DukanKhata

**A simple supplier-bill and payment tracker for shops.** DukanKhata helps shopkeepers record supplier bills, keep an eye on pending balances, track payments, and export useful reports.

Live app: [dukankhaata.netlify.app](https://dukankhaata.netlify.app/)

## What it does

- **Dashboard:** See the total pending amount, supplier count, and pending bill count at a glance.
- **Supplier list:** Add and manage the suppliers you buy from.
- **Bill entry:** Record a bill against a supplier with its date, amount, and salesman details.
- **Pending bills:** Review outstanding balances, filter by supplier, and record partial or full payments.
- **Paid bills:** Look back at bills whose balances have been cleared and review their payment history.
- **Supplier report:** Select one supplier and optionally set From and To dates. The filter uses the bill date, includes both date endpoints, and supports quick ranges such as this month, last month, and the last 30 days.
- **Exports:** Download supplier-specific or whole-shop CSV files that open in Excel, and create print-ready PDF reports through the browser's print dialog.

## Use the app

1. Open [dukankhaata.netlify.app](https://dukankhaata.netlify.app/) in a browser.
2. Create a shop account with a shop name, email, and password. The app requires at least 6 characters, including a letter, a number, and a special character.
3. If email confirmation is enabled in Supabase, confirm the email, then sign in.
4. Add suppliers, record bills, and update payments as they happen.
5. Use **Supplier Bill Download** for a single supplier and date range, or use the home-screen export for a whole-shop report.

For a PDF export, the app opens a print-friendly report. In the browser print window, select **Save as PDF** to download it as a PDF file.

## Run or host the app

This is a single-page HTML app. There is no Node.js build step or framework required.

- Open `index.html` in a modern browser for a basic local preview.
- For hosted sign-in and cloud data, deploy the file to an HTTPS static host such as Netlify.
- Configure the Supabase project's **Site URL** and allowed redirect URLs to match the hosted site.

## Supabase setup

The app uses the Supabase JavaScript client in the browser. It signs users in through Supabase Auth and stores each account's shop name, suppliers, bills, and salesman list in the `shop_data` table.

Before using cloud features, configure a Supabase project:

1. Run [`DukanKhata-supabase-setup.sql`](DukanKhata-supabase-setup.sql) once in the Supabase SQL Editor. It creates the table and Row Level Security (RLS) policies.
2. In `index.html`, set the Supabase project URL and **publishable key** to your project's values. The app copy in this repository may already have these configured; use only the values from your own project.
3. In Supabase Authentication, configure email/password sign-in and the hosted app's Site URL and allowed redirect URLs.
4. Deploy to HTTPS and test with two separate accounts. Confirm each account can see and change only its own shop records.

The first sign-in starts with an empty cloud record. This project does not automatically import or copy existing browser data into Supabase.

## Security notes

- **Supabase Auth** handles account sign-in; passwords are not stored by the app as business data.
- **RLS policies** restrict access to the `shop_data` row whose `user_id` matches the signed-in user's Supabase identity.
- The browser can contain a Supabase **publishable** key. This key is designed for client apps and is not an admin credential; database access must remain protected by RLS.
- **Never put a Supabase secret/service-role key or database password in `index.html`, GitHub, or any public client code.** If one was exposed, rotate it in Supabase.
- Use HTTPS, a strong unique password, and do not share sign-in credentials.

This is a small shop-focused app, not a complete multi-user business platform. Each shop account is isolated, but staff invitations, roles, and shared team access are not implemented. Public sign-up may allow other shops to create their own accounts if enabled in Supabase. The app does not provide an automatic backup/restore workflow, so configure and verify a backup strategy in Supabase before relying on it for important records.

## Technology

- HTML, CSS, and vanilla JavaScript
- Supabase Auth and Postgres through `supabase-js`
- Netlify or another static HTTPS host

## Project files

- `index.html` - DukanKhata web app
- `DukanKhata-supabase-setup.sql` - database table and access-policy setup
- `README.md` - this guide

## License

No license is currently specified. All rights are reserved by the repository owner unless a license is added.

