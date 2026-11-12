# only music

## Supabase sign-in setup

The app uses Supabase Auth for email/password sign-in. Create accounts in the Supabase dashboard; public sign-up is not included. Disable public sign-ups in Supabase Auth settings. New profiles receive the `listener` role by default. Supabase sessions are persisted in the browser and restored after a normal page reload; signing out clears the session.

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor. If the project is already set up, run it again to create the shared song-change table.
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

The profile table allows signed-in users to read only their own role. Role changes are restricted to trusted Supabase administration. Song additions are available only in the admin UI, and row-level security on `public.songs` must restrict writes to admins. The `song_changes` table stores shared metadata edits and deletion markers for built-in and added songs; its schema and admin-only write policies are created by [`supabase/schema.sql`](./supabase/schema.sql). The browser also caches added songs in `localStorage`.

## Importing embedded MP3 cover art

On sign-in, the app checks each Cloudinary MP3 URL for embedded ID3 tags using bounded HTTP range requests. It displays embedded artwork from the audio file directly in the library and reads its title, artist, and album metadata where the song details are missing. Artwork is kept in memory for that browser session; the MP3 itself is not downloaded in full or uploaded again. The Cloudinary host must permit browser access to the audio URL.

When adding a song, you can also select the original MP3 file in **Get cover from MP3** to extract artwork locally. That image is uploaded to the Cloudinary account used by the song URL and saved as a persistent cover URL.

To enable cover uploads, create an **unsigned** upload preset in Cloudinary's Upload settings and put its name in `cloudinaryUploadPreset` in [`supabase-config.js`](./supabase-config.js). Restrict the preset to image formats and a suitable file-size limit; unsigned presets are public. The preset name is public; do not put a Cloudinary API secret in browser code. This automatic extraction supports embedded MP3 ID3 artwork. Songs without supported embedded art can still use the cover URL field.


test @123123123


,,