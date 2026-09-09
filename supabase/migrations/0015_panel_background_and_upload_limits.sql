-- Panel background images (in addition to the existing page background image),
-- plus size/type limits on the image upload buckets. These buckets previously had
-- no file_size_limit or allowed_mime_types at all, meaning any signed-in member
-- could upload an arbitrarily large or non-image file to a public bucket served
-- on every profile view. post-media is intentionally left alone here since it also
-- holds video posts and needs a separate, larger limit.

update storage.buckets
set file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id in ('avatars', 'profile-themes');