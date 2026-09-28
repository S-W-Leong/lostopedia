-- Column grants are required because RLS cannot hide columns on a row.
-- The server retrieves claimant records only after checking owner/admin access.
revoke select on public.items from authenticated;

do $$
declare
  safe_columns text;
begin
  select string_agg(format('%I', attname), ', ' order by attnum)
    into safe_columns
  from pg_attribute
  where attrelid = 'public.items'::regclass
    and attnum > 0
    and not attisdropped
    and attname not in (
      'claimant_name', 'claimant_student_id', 'claimant_recorded_by'
    );
  execute format('grant select (%s) on public.items to authenticated', safe_columns);
end;
$$;
