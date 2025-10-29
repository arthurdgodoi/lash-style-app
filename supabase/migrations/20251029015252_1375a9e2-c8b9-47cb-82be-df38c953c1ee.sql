-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the notification-scheduler edge function to run every hour
-- This will check for appointments 16 hours away and create morning notifications at 7 AM
SELECT cron.schedule(
  'notification-scheduler',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://wrbsknjrlacdemgtqoyh.supabase.co/functions/v1/notification-scheduler',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYnNrbmpybGFjZGVtZ3Rxb3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDU1MzIsImV4cCI6MjA3Njk4MTUzMn0.yr8ozLh1-QJe-SC2L93UndJbLBDYfKro9hzuFtotCfo"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);