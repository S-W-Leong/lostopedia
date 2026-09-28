BEGIN;
SET LOCAL standard_conforming_strings = on;
DO $organization_setup$
DECLARE
  existing_location_id uuid;
BEGIN
  SELECT default_campus_id INTO existing_location_id
  FROM public.deployment_settings WHERE id = true FOR UPDATE;

  IF existing_location_id IS NULL THEN
    INSERT INTO public.campuses
      (name, slug, country, city, default_latitude, default_longitude, default_zoom)
    VALUES ('Main location', 'main', 'Example country', 'Example city', 0, 0, 2)
    RETURNING id INTO existing_location_id;

    INSERT INTO public.deployment_settings
      (id, default_campus_id, registration_mode, allowed_email_domains, config_hash)
    VALUES (true, existing_location_id, 'restricted', ARRAY['example.org']::text[], '463407fb0c40958ec86d256485a711a3ea551915fcaf2e38a7f8a6cf03b0a050');
  ELSE
    UPDATE public.campuses SET
      name = 'Main location',
      slug = 'main',
      country = 'Example country',
      city = 'Example city',
      default_latitude = 0,
      default_longitude = 0,
      default_zoom = 2,
      is_active = true
    WHERE id = existing_location_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Configured default location is missing';
    END IF;

    UPDATE public.deployment_settings SET
      registration_mode = 'restricted',
      allowed_email_domains = ARRAY['example.org']::text[],
      config_hash = '463407fb0c40958ec86d256485a711a3ea551915fcaf2e38a7f8a6cf03b0a050'
    WHERE id = true;
  END IF;
END;
$organization_setup$;
COMMIT;
