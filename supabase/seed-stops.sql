insert into public.stops
  (id, name, city, latitude, longitude, coordinate_source, verification_status, source_url, is_demo)
values
  ('community-muet-jamshoro', 'MUET Jamshoro', 'Jamshoro', 25.4180, 68.2610, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false),
  ('community-jamshoro-bus-stand', 'Jamshoro Bus Stand', 'Jamshoro', 25.4300, 68.2800, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false),
  ('community-kotri', 'Kotri', 'Jamshoro', 25.3650, 68.3080, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false),
  ('community-hyderabad-latifabad', 'Hyderabad Latifabad', 'Hyderabad', 25.3960, 68.3570, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false),
  ('community-hyderabad-hirabad', 'Hyderabad Hirabad', 'Hyderabad', 25.3980, 68.3700, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false),
  ('community-hyderabad-railway-station', 'Hyderabad Railway Station', 'Hyderabad', 25.3860, 68.3640, 'Community-listed, approximate coordinates, not officially verified', 'unverified', null, false)
on conflict (id) do nothing;
