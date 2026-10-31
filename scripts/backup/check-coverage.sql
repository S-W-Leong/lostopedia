-- Read-only inventory: never select Auth credentials or user row contents here.
-- Leaf tables have COPY sections; partitioned parents do not.
WITH relations AS (
  SELECT n.nspname AS schema, c.relname AS name, c.oid,
    EXISTS (SELECT 1 FROM pg_depend d
      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e') AS extension_owned
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
), excluded AS (
  SELECT schema, name FROM relations
  WHERE extension_owned
    OR (schema, name) IN (('auth', 'schema_migrations'), ('storage', 'migrations'),
      ('storage', 'buckets_vectors'), ('storage', 'vector_indexes'))
)
SELECT json_build_object(
  'server_version', current_setting('server_version'),
  'server_version_num', current_setting('server_version_num')::int,
  'schema_fingerprint', (SELECT md5(string_agg(definition, E'\n' ORDER BY definition)) FROM (
    SELECT 'attribute:' || a::text AS definition FROM pg_attribute a
      JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations') AND a.attnum>0
    UNION ALL SELECT 'constraint:' || c::text FROM pg_constraint c
      JOIN pg_namespace n ON n.oid=c.connamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
    UNION ALL SELECT 'function:' || p::text FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
    UNION ALL SELECT 'policy:' || p::text FROM pg_policy p
      JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
    UNION ALL SELECT 'trigger:' || t::text FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
    UNION ALL SELECT 'relation:' || c.oid::text || ':' || coalesce(c.relacl::text, '') || ':' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
    UNION ALL SELECT 'default:' || d::text FROM pg_attrdef d
      JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'auth', 'storage', 'supabase_migrations')
  ) definitions),
  'bypass_rls', (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user),
  'schemas', (SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
  'tables', COALESCE((SELECT json_agg(json_build_object('schema', r.schema, 'name', r.name)
    ORDER BY r.schema, r.name) FROM relations r
    WHERE NOT EXISTS (SELECT 1 FROM excluded x WHERE x.schema=r.schema AND x.name=r.name)), '[]'::json),
  'excluded_tables', COALESCE((SELECT json_agg(json_build_object('schema', schema, 'name', name)
    ORDER BY schema, name) FROM excluded), '[]'::json),
  'extensions', (SELECT json_agg(json_build_object('name', extname, 'version', extversion)
    ORDER BY extname) FROM pg_extension),
  'publications', (SELECT json_agg(json_build_object('name', pubname, 'all_tables', puballtables)) FROM pg_publication),
  'publication_tables', (SELECT json_agg(json_build_object('publication', pubname, 'schema', schemaname, 'table', tablename))
    FROM pg_publication_tables),
  'roles', (SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles)
);
