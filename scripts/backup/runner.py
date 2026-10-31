"""One-shot database backup. All external command diagnostics remain private."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
from urllib.parse import parse_qs, unquote, urlsplit

from archive import DATA_SCHEMAS, build, sha256, validate_inventory
from retention import PREFIX, order_key, select_deletions


HERE = Path(__file__).resolve().parent
CLI_VERSION = '2.75.0'
POSTGRES_MAJOR = 17
# Match private stderr only to select a fixed message. Never print matched text.
DATABASE_FAILURES = (
    ('password authentication failed', 'Database authentication failed'),
    ('certificate verify failed', 'Database TLS certificate verification failed'),
    ('could not translate host name', 'Database hostname resolution failed'),
    ('network is unreachable', 'Database network is unreachable'),
    ('connection refused', 'Database connection was refused'),
    ('timeout expired', 'Database connection timed out'),
    ('permission denied', 'Database permission check failed'),
    ('tenant or user not found', 'Database pooler tenant or user was not found'),
)
DATABASE_FALLBACK = 'Database command failed; unrecognized diagnostics suppressed'
SAFE_RUNTIME_REASONS = {reason for _, reason in DATABASE_FAILURES} | {
    DATABASE_FALLBACK,
    'Unreviewed database schemas; review backup coverage privately',
    'Required template/Auth/Storage tables are missing',
    'Source needs PostgreSQL 17 and a verified RLS-bypassing export role',
    'Review encrypted-column key recovery before enabling backups',
    'Unsupported Vault/vector data requires a reviewed recovery procedure',
}


class BackupError(Exception):
    pass


def config(env):
    required = ['SUPABASE_BACKUP_DB_URL', 'SUPABASE_BACKUP_PROJECT_REF',
                'BACKUP_AGE_RECIPIENT', 'R2_ENDPOINT_URL', 'R2_BUCKET',
                'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'GITHUB_SHA',
                'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']
    if any(not env.get(name) for name in required):
        raise ValueError('Missing backup configuration; see the runbook')
    ref = env['SUPABASE_BACKUP_PROJECT_REF']
    if not re.fullmatch('[a-z]{20}', ref):
        raise ValueError('Invalid source project reference')
    db = urlsplit(env['SUPABASE_BACKUP_DB_URL'])
    direct = db.hostname == f'db.{ref}.supabase.co' and unquote(db.username or '') == 'postgres'
    pooler = (db.hostname or '').endswith('.pooler.supabase.com') and unquote(db.username or '') == f'postgres.{ref}'
    if (db.scheme not in ('postgres', 'postgresql') or not (direct or pooler)
            or (db.port or 5432) != 5432 or db.path != '/postgres' or not db.password):
        raise ValueError('Database must match the configured Supabase project and Session/direct connection')
    query = parse_qs(db.query, keep_blank_values=True)
    if set(query) - {'sslmode', 'sslrootcert'} or query.get('sslmode', ['verify-full']) not in (['require'], ['verify-full']):
        raise ValueError('Unsupported database connection options')
    endpoint = env['R2_ENDPOINT_URL']
    if not re.fullmatch(r'https://[a-f0-9]{32}\.r2\.cloudflarestorage\.com', endpoint):
        raise ValueError('Expected a private R2 S3 endpoint')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', env['R2_BUCKET']):
        raise ValueError('Invalid backup bucket name')
    if not re.fullmatch(r'age1[a-z0-9]{58}', env['BACKUP_AGE_RECIPIENT']):
        raise ValueError('Expected one native age public recipient')
    if any(not re.fullmatch(r'[1-9][0-9]*', env[name]) for name in ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']):
        raise ValueError('Invalid run identity')
    if not re.fullmatch(r'[a-f0-9]{40}', env['GITHUB_SHA']):
        raise ValueError('Invalid source commit')
    certificate = env.get('SUPABASE_BACKUP_CA_CERT', '').strip()
    try:
        if len(certificate) > 65536 or not re.fullmatch(
                r'(?:-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----\s*)+', certificate):
            raise ValueError('Invalid PEM')
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_verify_locations(cadata=certificate)
        if not context.cert_store_stats()['x509_ca']:
            raise ValueError('Expected a CA certificate')
    except (ValueError, ssl.SSLError):
        raise ValueError('Set SUPABASE_BACKUP_CA_CERT to the PEM CA certificate from Supabase Database Settings') from None
    return {'ref': ref, 'bucket': env['R2_BUCKET'], 'endpoint': endpoint,
            'recipient': env['BACKUP_AGE_RECIPIENT'], 'ca_cert': certificate + '\n', 'db_env': {
                'PGHOST': db.hostname, 'PGPORT': '5432', 'PGUSER': unquote(db.username),
                'PGPASSWORD': unquote(db.password), 'PGDATABASE': 'postgres',
                'PGSSLMODE': 'verify-full',
                'PGCONNECT_TIMEOUT': '15', 'PGAPPNAME': 'lostopedia-weekly-backup',
                'PGOPTIONS': '-c default_transaction_read_only=on -c statement_timeout=300000 -c lock_timeout=10000',
            }}


class Backup:
    def __init__(self, env, temp_root=None):
        self.env = dict(env)
        self.settings = config(env)
        self.temp_root = temp_root
        self.stage = 'preflight'
        # Do not pass arbitrary libpq options, service files, or URL credentials to children.
        self.base_env = {k: v for k, v in env.items() if not k.startswith('PG')
                         and k not in {'SUPABASE_BACKUP_DB_URL', 'SUPABASE_BACKUP_CA_CERT'}}
        self.base_env.update(AWS_DEFAULT_REGION='auto', AWS_EC2_METADATA_DISABLED='true', AWS_PAGER='', LC_ALL='C')

    def command(self, args, output=None, database=False):
        env = self.base_env | (self.settings['db_env'] if database else {})
        try:
            if output is not None:
                with Path(output).open('wb') as stream:
                    subprocess.run(args, env=env, stdout=stream, stderr=subprocess.PIPE,
                                   check=True, timeout=600)
                return ''
            return subprocess.run(args, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                  check=True, timeout=600).stdout.decode('utf-8')
        except subprocess.CalledProcessError as error:
            if database:
                diagnostic = error.stderr or b''
                if isinstance(diagnostic, bytes):
                    diagnostic = diagnostic.decode('utf-8', errors='replace')
                reason = next((reason for pattern, reason in DATABASE_FAILURES
                               if pattern in diagnostic.lower()), DATABASE_FALLBACK)
                raise BackupError(reason) from None
            raise BackupError(f'Backup failed at {self.stage}; external output suppressed to protect credentials/data') from None
        except (subprocess.SubprocessError, OSError, UnicodeError):
            raise BackupError(f'Backup failed at {self.stage}; external output suppressed to protect credentials/data') from None

    def s3(self, args, output=None):
        return self.command(['aws', '--endpoint-url', self.settings['endpoint'], *args], output)

    def sql(self, query=None, file=None):
        return self.command(['psql', '--no-psqlrc', '--tuples-only', '--no-align',
                             '--set', 'ON_ERROR_STOP=1', *(['--file', str(file)] if file else ['--command', query])],
                            database=True)

    def template_export(self, directory, name, flags):
        # Obtain the pinned CLI's Supabase-specific role/schema filtering, without giving
        # credentials to its generated shell script. Execute on the installed PG client.
        template = self.command(['supabase', 'db', 'dump', '--db-url',
                                 'postgresql://postgres:unused@localhost:5432/postgres',
                                 '--dry-run', *flags])
        script = directory / f'{name}.sh'
        script.write_text('\n'.join(line for line in template.splitlines()
                                     if not line.startswith('export PG')) + '\n')
        self.command(['bash', str(script)], directory / name, database=True)
        script.unlink()

    def export(self, directory):
        self.stage = 'database inventory query'
        inventory = json.loads(self.sql(file=HERE / 'check-coverage.sql'))
        self.stage = 'database coverage validation'
        validate_inventory(inventory)
        self.stage = 'database version and export role validation'
        if not inventory['bypass_rls'] or inventory['server_version_num'] // 10000 != POSTGRES_MAJOR:
            raise BackupError('Source needs PostgreSQL 17 and a verified RLS-bypassing export role')
        extensions = {item['name'] for item in inventory['extensions']}
        self.stage = 'database encryption coverage validation'
        if 'pgsodium' in extensions:
            raise BackupError('Review encrypted-column key recovery before enabling backups')
        self.stage = 'database Vault/vector coverage checks'
        for table in ['vault.secrets', 'storage.buckets_vectors', 'storage.vector_indexes']:
            if self.sql(query=f"SELECT to_regclass('{table}') IS NOT NULL").strip() == 't':
                if int(self.sql(query=f'SELECT count(*) FROM {table}').strip()):
                    raise BackupError('Unsupported Vault/vector data requires a reviewed recovery procedure')
        self.stage = 'database cron inventory'
        inventory['cron_jobs'] = []
        if self.sql(query="SELECT to_regclass('cron.job') IS NOT NULL").strip() == 't':
            inventory['cron_jobs'] = json.loads(self.sql(query="SELECT coalesce(json_agg(j), '[]'::json) FROM cron.job j"))
        self.stage = 'schema and roles export'
        self.template_export(directory, 'roles.sql', ['--role-only'])
        self.template_export(directory, 'schema.sql', [])
        self.command(['pg_dump', '--schema-only', '--quote-all-identifiers',
                      '--schema=auth', '--schema=storage'], directory / 'managed-schema.sql', database=True)
        if 'supabase_migrations' in inventory['schemas']:
            self.command(['pg_dump', '--schema-only', '--quote-all-identifiers',
                          '--schema=supabase_migrations'], directory / 'migration-schema.sql', database=True)
        self.stage = 'consistent app/Auth data export'
        args = ['pg_dump', '--data-only', '--quote-all-identifiers']
        for schema in sorted(set(inventory['schemas']) & DATA_SCHEMAS):
            args.append(f'--schema={schema}')
        for table in inventory['excluded_tables']:
            # Quoted pg_dump patterns match literal identifiers, including wildcard characters.
            pattern = '.'.join('"' + table[key].replace('"', '""') + '"' for key in ['schema', 'name'])
            args.append(f'--exclude-table={pattern}')
        self.command(args, directory / 'data.sql', database=True)
        self.stage = 'post-export schema check'
        after = json.loads(self.sql(file=HERE / 'check-coverage.sql'))
        if any(after[key] != inventory[key] for key in ['schemas', 'tables', 'excluded_tables', 'schema_fingerprint']):
            raise BackupError('Schema changed during export; retry outside the migration window')
        (directory / 'inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')

    def publish(self, archive, key, directory):
        order_key(key)
        uri = f's3://{self.settings["bucket"]}/{key}'
        checksum, size = sha256(archive), archive.stat().st_size
        self.stage = 'encrypted upload'
        self.s3(['s3', 'cp', str(archive), uri, '--only-show-errors'])
        self.stage = 'encrypted read-back verification'
        readback = directory / 'readback.age'
        self.s3(['s3', 'cp', uri, str(readback), '--only-show-errors'])
        if readback.stat().st_size != size or sha256(readback) != checksum:
            raise BackupError('Encrypted upload failed read-back verification; previous backups preserved')
        readback.unlink()
        marker = {'key': key, 'size': size, 'sha256': checksum,
                  'completed_at': datetime.now(timezone.utc).isoformat()}
        marker_path = directory / 'complete.json'
        marker_path.write_text(json.dumps(marker) + '\n')
        self.stage = 'completion marker publication'
        self.s3(['s3', 'cp', str(marker_path), uri + '.complete.json', '--only-show-errors'])
        return marker

    def prune(self, directory):
        self.stage = 'retention (new backup already verified)'
        # AWS CLI's default paginator retrieves every page; do not add --no-paginate or --max-items.
        objects = json.loads(self.s3(['s3api', 'list-objects-v2', '--bucket', self.settings['bucket'],
                                     '--prefix', PREFIX, '--output', 'json'])).get('Contents', [])
        listing = {obj['Key']: obj for obj in objects}
        completed = []
        for key in sorted(listing):
            if not key.endswith('.tar.age.complete.json'):
                continue
            archive_key = key.removesuffix('.complete.json')
            order_key(archive_key)
            if archive_key not in listing:
                continue  # Stale marker from an interrupted prune; no archive to recover.
            path = directory / 'marker.json'
            self.s3(['s3', 'cp', f's3://{self.settings["bucket"]}/{key}', str(path), '--only-show-errors'])
            marker = json.loads(path.read_text())
            if (marker['key'] != archive_key or type(marker['size']) is not int
                    or marker['size'] != listing[archive_key]['Size'] or marker['size'] <= 0
                    or not re.fullmatch('[a-f0-9]{64}', marker['sha256'])):
                raise BackupError('Invalid completion marker; retention aborted')
            datetime.fromisoformat(marker['completed_at'])
            completed.append(marker)
        obsolete = select_deletions(completed)
        for key in obsolete:
            for member in [key, key + '.complete.json']:
                self.s3(['s3api', 'delete-object', '--bucket', self.settings['bucket'], '--key', member])
        return len(completed) - len(obsolete)

    def run(self):
        started = time.monotonic()
        with tempfile.TemporaryDirectory(prefix='lostopedia-backup-', dir=self.temp_root) as tmp:
            directory = Path(tmp)
            certificate = directory / 'source-ca.crt'
            with open(certificate, 'x', opener=lambda path, flags: os.open(path, flags, 0o600)) as stream:
                stream.write(self.settings['ca_cert'])
            self.settings['db_env']['PGSSLROOTCERT'] = str(certificate)
            # Reject an invalid recipient before connecting to the source database.
            probe = directory / 'probe'
            probe.write_bytes(b'backup recipient validation')
            self.command(['age', '--recipient', self.settings['recipient'], '--output', str(directory / 'probe.age'), str(probe)])
            versions = {name: self.command(args).strip() for name, args in {
                'supabase': ['supabase', '--version'], 'pg_dump': ['pg_dump', '--version'],
                'age': ['age', '--version'], 'aws': ['aws', '--version']}.items()}
            if versions['supabase'] != CLI_VERSION or not re.search(r'\b17\.', versions['pg_dump']):
                raise BackupError('Backup tooling versions differ from the reviewed contract')
            content = directory / 'content'
            content.mkdir()
            self.export(content)
            shutil.copytree(HERE.parents[1] / 'supabase' / 'migrations', content / 'migrations')
            shutil.copyfile(HERE.parents[1] / 'config' / 'organization.json', content / 'organization.json')
            (content / 'tools.json').write_text(json.dumps(versions) + '\n')
            now = datetime.now(timezone.utc)
            self.stage = 'coverage validation and packaging'
            tarball = directory / 'backup.tar.gz'
            build(content, tarball, {'project_ref': self.settings['ref'], 'commit': self.env['GITHUB_SHA'],
                                    'created_at': now.isoformat(), 'tools': versions})
            self.stage = 'encryption'
            ciphertext = directory / 'backup.tar.age'
            self.command(['age', '--recipient', self.settings['recipient'], '--output', str(ciphertext), str(tarball)])
            key = f'{PREFIX}{now:%Y%m%dT%H%M%SZ}-{self.env["GITHUB_RUN_ID"]}-{self.env["GITHUB_RUN_ATTEMPT"]}.tar.age'
            marker = self.publish(ciphertext, key, directory)
            retained = self.prune(directory)
            summary = (f'Weekly database/Auth backup verified\n\nUTC: {now.isoformat()}\n\n'
                       f'Object: `{key}`\n\nEncrypted bytes: {marker["size"]}\n\n'
                       f'Retained recovery points: {retained}\n\nDuration: {time.monotonic() - started:.1f}s\n\n'
                       'Coverage validated; image bytes excluded. Upload verification is not a restore drill.\n')
            if self.env.get('GITHUB_STEP_SUMMARY'):
                with Path(self.env['GITHUB_STEP_SUMMARY']).open('a') as stream:
                    stream.write(summary)
            print(summary)


def main():
    os.umask(0o077)
    backup = None
    try:
        backup = Backup(os.environ)
        backup.run()
    except (BackupError, ValueError, KeyError, OSError, TypeError) as error:
        if backup is None and isinstance(error, ValueError):
            # Only fixed validation messages may reach logs; parser exceptions can contain input.
            safe_messages = {
                'Missing backup configuration; see the runbook',
                'Invalid source project reference',
                'Database must match the configured Supabase project and Session/direct connection',
                'Unsupported database connection options',
                'Expected a private R2 S3 endpoint',
                'Invalid backup bucket name',
                'Expected one native age public recipient',
                'Invalid run identity',
                'Invalid source commit',
                'Set SUPABASE_BACKUP_CA_CERT to the PEM CA certificate from Supabase Database Settings',
            }
            reason = str(error)
            if reason not in safe_messages:
                reason = 'Invalid configuration format; details suppressed'
            print(f'Backup configuration rejected: {reason}', file=sys.stderr)
            return 1
        stage = backup.stage if backup else 'configuration'
        reason = str(error)
        if backup is not None and reason in SAFE_RUNTIME_REASONS:
            print(f'Backup failed at {stage}: {reason}. No success claimed. '
                  'Raw diagnostics suppressed to protect credentials and user data.', file=sys.stderr)
            return 1
        print(f'Backup failed at {stage}. No success claimed; inspect configuration and runbook. '
              'Raw diagnostics suppressed to protect credentials and user data.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
