/*
# Storage policies for student-photos bucket

Allows anon + authenticated to upload, read, and delete profile pictures
in the `student-photos` storage bucket. The bucket was created as public,
so public read works via URL; these policies govern direct API access
(uploads from the admin portal).
*/

DROP POLICY IF EXISTS "anon_read_photos" ON storage.objects;
CREATE POLICY "anon_read_photos" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "anon_upload_photos" ON storage.objects;
CREATE POLICY "anon_upload_photos" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "anon_delete_photos" ON storage.objects;
CREATE POLICY "anon_delete_photos" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'student-photos');
