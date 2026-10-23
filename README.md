# only music

## Supabase sign-in setup

The app uses Supabase Auth for email/password sign-in. Create accounts in the Supabase dashboard; public sign-up is not included. Disable public sign-ups in Supabase Auth settings. New profiles receive the `listener` role by default.

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
2. Create the Listener and Admin users in the dashboard's **Authentication → Users** page.
3. Promote the intended Admin by running this query in the SQL Editor, replacing the email:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id
     from auth.users
     where email = 'admin@example.com'
   );
   ```

4. Put the project URL and **publishable/anon key** in [`supabase-config.js`](./supabase-config.js). Never put a `service_role` key in browser code.
5. Serve the app over HTTP or HTTPS and sign in with one of the dashboard-created accounts.

The profile table allows signed-in users to read only their own role. Role changes are restricted to trusted Supabase administration. Song additions and deletions are available only in the admin UI, but that client-side check is not an authorization boundary. Configure row-level security policies on `public.songs` to restrict writes and deletes to admins. The browser also caches songs in `localStorage`.