import json
import contextlib
import io
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from test_archive import load


ENV = {
    'SUPABASE_BACKUP_DB_URL': 'postgresql://postgres.abcdefghijklmnopqrst:SECRET@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
    'SUPABASE_BACKUP_PROJECT_REF': 'abcdefghijklmnopqrst',
    'BACKUP_AGE_RECIPIENT': 'age1' + 'a' * 58,
    'R2_ENDPOINT_URL': 'https://' + 'a' * 32 + '.r2.cloudflarestorage.com',
    'R2_BUCKET': 'test-backups', 'AWS_ACCESS_KEY_ID': 'TESTKEY',
    'AWS_SECRET_ACCESS_KEY': 'SECRET', 'GITHUB_SHA': 'a' * 40,
    'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1',
    'SUPABASE_BACKUP_CA_CERT': (Path(__file__).parent / 'fixtures' / 'ca.crt').read_text(),
}


class RunnerTests(unittest.TestCase):
    def test_invalid_ca_fails_before_database_access_without_exposing_input(self):
        runner = load('runner')
        for certificate in ['', 'SECRET-invalid', '-----BEGIN CERTIFICATE-----\nSECRET\n-----END CERTIFICATE-----',
                            ENV['SUPABASE_BACKUP_CA_CERT'] + '\n-----BEGIN ' + 'PRIVATE KEY-----\nSECRET\n-----END ' + 'PRIVATE KEY-----']:
            with self.subTest(certificate=certificate):
                stderr = io.StringIO()
                with patch.dict(runner.os.environ, ENV | {'SUPABASE_BACKUP_CA_CERT': certificate}, clear=True), \
                        contextlib.redirect_stderr(stderr):
                    result = runner.main()
                self.assertEqual(result, 1)
                self.assertIn('SUPABASE_BACKUP_CA_CERT', stderr.getvalue())
                self.assertNotIn('SECRET', stderr.getvalue())

    def test_ca_is_used_privately_and_removed_after_database_failure(self):
        runner = load('runner')
        with tempfile.TemporaryDirectory() as temp:
            backup = runner.Backup(ENV, Path(temp))
            def command(args, output=None, database=False):
                if args == ['supabase', '--version']:
                    return '2.75.0'
                if args == ['pg_dump', '--version']:
                    return 'pg_dump (PostgreSQL) 17.11'
                return 'test-tool'
            def export(directory):
                certificate = Path(backup.settings['db_env']['PGSSLROOTCERT'])
                self.assertEqual(certificate.read_text(), ENV['SUPABASE_BACKUP_CA_CERT'])
                self.assertEqual(certificate.stat().st_mode & 0o777, 0o600)
                self.assertEqual(certificate.parent, directory.parent)
                self.assertNotEqual(certificate.parent, directory)
                self.assertEqual(backup.settings['db_env']['PGSSLMODE'], 'verify-full')
                self.assertNotIn('SUPABASE_BACKUP_CA_CERT', backup.base_env)
                raise runner.BackupError('fixture database failure')
            with patch.object(backup, 'command', side_effect=command), \
                    patch.object(backup, 'export', side_effect=export):
                with self.assertRaisesRegex(runner.BackupError, 'fixture database failure'):
                    backup.run()
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_config_rejects_wrong_project_insecure_endpoint_and_transaction_pooler(self):
        runner = load('runner')
        runner.config(ENV)
        for field, value in [
            ('SUPABASE_BACKUP_PROJECT_REF', 'z' * 20),
            ('SUPABASE_BACKUP_DB_URL', ENV['SUPABASE_BACKUP_DB_URL'].replace(':5432/', ':6543/')),
            ('R2_ENDPOINT_URL', 'http://example.org'),
            ('R2_BUCKET', '../other'),
            ('SUPABASE_BACKUP_DB_URL', ENV['SUPABASE_BACKUP_DB_URL'].replace('sslmode=require', 'sslmode=disable')),
            ('GITHUB_RUN_ID', '$(echo SECRET)'),
        ]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                runner.config(ENV | {field: value})
        self.assertEqual(runner.config(ENV)['db_env']['PGSSLMODE'], 'verify-full')
        self.assertEqual(runner.config(ENV)['db_env']['PGPASSWORD'], 'SECRET')

    def test_database_failure_is_redacted_and_does_not_publish(self):
        runner = load('runner')
        with tempfile.TemporaryDirectory() as temp:
            backup = runner.Backup(ENV, Path(temp))
            def fail(*args, **kwargs):
                raise subprocess.CalledProcessError(1, ['psql'], stderr=b'SECRET auth hash')
            with patch.object(runner.subprocess, 'run', side_effect=fail):
                with self.assertRaises(runner.BackupError) as error:
                    backup.run()
            self.assertNotIn('SECRET', str(error.exception))
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_readback_corruption_does_not_publish_marker_or_prune(self):
        runner = load('runner')
        with tempfile.TemporaryDirectory() as temp:
            backup = runner.Backup(ENV, Path(temp))
            archive = Path(temp) / 'cipher.age'
            archive.write_bytes(b'encrypted archive')
            uploaded = []
            def s3(args, output=None):
                if args[:2] == ['s3', 'cp']:
                    if args[2].startswith('s3://'):
                        Path(args[3]).write_bytes(b'corrupt')
                    else:
                        uploaded.append(args[3])
                    return ''
                raise AssertionError('Retention or marker operation before verification')
            with patch.object(backup, 's3', side_effect=s3):
                with self.assertRaises(runner.BackupError):
                    backup.publish(archive, 'lostopedia/database/20261029T000000Z-123-1.tar.age', Path(temp))
            self.assertEqual(len(uploaded), 1)
            self.assertFalse(any('complete.json' in key for key in uploaded))

    def test_missing_configuration_fails_without_exposing_values(self):
        with self.assertRaises(ValueError):
            load('runner').config(ENV | {'AWS_SECRET_ACCESS_KEY': ''})

    def test_main_reports_safe_configuration_reason_without_values(self):
        runner = load('runner')
        stderr = io.StringIO()
        with patch.dict(runner.os.environ, ENV | {'BACKUP_AGE_RECIPIENT': 'SECRET-invalid'}, clear=True):
            with contextlib.redirect_stderr(stderr):
                result = runner.main()
        self.assertEqual(result, 1)
        self.assertIn('Expected one native age public recipient', stderr.getvalue())
        self.assertNotIn('SECRET', stderr.getvalue())

    def test_main_suppresses_unexpected_configuration_exception_details(self):
        runner = load('runner')
        stderr = io.StringIO()
        invalid_url = ENV['SUPABASE_BACKUP_DB_URL'].replace(':5432/', ':SECRET/')
        with patch.dict(runner.os.environ, ENV | {'SUPABASE_BACKUP_DB_URL': invalid_url}, clear=True):
            with contextlib.redirect_stderr(stderr):
                result = runner.main()
        self.assertEqual(result, 1)
        self.assertIn('Invalid configuration format; details suppressed', stderr.getvalue())
        self.assertNotIn('SECRET', stderr.getvalue())

    def test_failed_marker_publication_is_not_a_success(self):
        runner = load('runner')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / 'cipher.age'
            archive.write_bytes(b'encrypted')
            backup = runner.Backup(ENV)
            def s3(args, output=None):
                if args[2].startswith('s3://'):
                    Path(args[3]).write_bytes(b'encrypted')
                elif args[3].endswith('.complete.json'):
                    raise runner.BackupError('marker publication failed')
                return ''
            with patch.object(backup, 's3', side_effect=s3):
                with self.assertRaises(runner.BackupError):
                    backup.publish(archive, 'lostopedia/database/20261029T000000Z-123-1.tar.age', root)

    def test_main_hides_tool_stderr_and_cleans_temporary_material(self):
        runner = load('runner')
        stderr, stdout = io.StringIO(), io.StringIO()
        def fail(*args, **kwargs):
            raise subprocess.CalledProcessError(1, ['age'], stderr=b'SECRET sensitive record')
        with patch.dict(runner.os.environ, ENV, clear=True), patch.object(runner.subprocess, 'run', side_effect=fail):
            with contextlib.redirect_stderr(stderr), contextlib.redirect_stdout(stdout):
                result = runner.main()
        self.assertEqual(result, 1)
        self.assertNotIn('SECRET', stderr.getvalue() + stdout.getvalue())
        self.assertIn('preflight', stderr.getvalue())

    def test_main_reports_database_failure_categories_without_raw_diagnostics(self):
        runner = load('runner')
        cases = [
            (b'password authentication failed for user SECRET', 'Database authentication failed'),
            (b'SSL error: certificate verify failed SECRET', 'Database TLS certificate verification failed'),
            (b'could not translate host name SECRET to address', 'Database hostname resolution failed'),
            (b'connection to server SECRET failed: Network is unreachable', 'Database network is unreachable'),
            (b'connection to server SECRET failed: Connection refused', 'Database connection was refused'),
            (b'connection to server SECRET failed: timeout expired', 'Database connection timed out'),
            (b'ERROR: permission denied for table SECRET', 'Database permission check failed'),
            (b'FATAL: Tenant or user not found SECRET', 'Database pooler tenant or user was not found'),
            (b'ERROR: unknown SECRET sensitive row', 'Database command failed; unrecognized diagnostics suppressed'),
        ]
        for diagnostic, expected in cases:
            with self.subTest(expected=expected):
                stderr, stdout = io.StringIO(), io.StringIO()
                def run(backup):
                    backup.stage = 'database inventory query'
                    backup.sql(file=runner.HERE / 'check-coverage.sql')
                error = subprocess.CalledProcessError(1, ['psql'], stderr=diagnostic)
                with patch.dict(runner.os.environ, ENV, clear=True), \
                        patch.object(runner.Backup, 'run', run), \
                        patch.object(runner.subprocess, 'run', side_effect=error), \
                        contextlib.redirect_stderr(stderr), contextlib.redirect_stdout(stdout):
                    result = runner.main()
                self.assertEqual(result, 1)
                self.assertIn(expected, stderr.getvalue())
                self.assertIn('database inventory query', stderr.getvalue())
                self.assertNotIn('SECRET', stderr.getvalue() + stdout.getvalue())

    def test_inventory_guard_reason_is_visible_but_unexpected_errors_are_private(self):
        runner = load('runner')
        for reason, expected in [
            ('Unreviewed database schemas; review backup coverage privately', 'Unreviewed database schemas'),
            ('Source needs PostgreSQL 17 and a verified RLS-bypassing export role', 'Source needs PostgreSQL 17'),
            ('Review encrypted-column key recovery before enabling backups', 'Review encrypted-column key recovery'),
            ('Unsupported Vault/vector data requires a reviewed recovery procedure', 'Unsupported Vault/vector data'),
            ('Unexpected SECRET sensitive row', 'Raw diagnostics suppressed'),
        ]:
            with self.subTest(reason=reason):
                stderr = io.StringIO()
                def run(backup):
                    backup.stage = 'database coverage validation'
                    raise ValueError(reason)
                with patch.dict(runner.os.environ, ENV, clear=True), \
                        patch.object(runner.Backup, 'run', run), contextlib.redirect_stderr(stderr):
                    result = runner.main()
                self.assertEqual(result, 1)
                self.assertIn(expected, stderr.getvalue())
                self.assertNotIn('SECRET', stderr.getvalue())

    def test_retention_ignores_orphans_and_handles_stale_markers(self):
        runner = load('runner')
        prefix = 'lostopedia/database/'
        objects = {}
        for day in range(1, 10):
            key = f'{prefix}202610{day:02d}T000000Z-{day}-1.tar.age'
            objects[key] = b'old'
            objects[key + '.complete.json'] = json.dumps({'key': key, 'size': 3,
                'sha256': 'a' * 64, 'completed_at': '2026-10-01T00:00:00+00:00'}).encode()
        orphan = prefix + '20261010T000000Z-10-1.tar.age'
        stale = prefix + '20260901T000000Z-1-1.tar.age.complete.json'
        objects[orphan] = b'unverified'
        objects[stale] = b'stale'
        backup = runner.Backup(ENV)
        def s3(args, output=None):
            if args[1] == 'list-objects-v2':
                return json.dumps({'Contents': [{'Key': key, 'Size': len(value)} for key, value in objects.items()]})
            if args[1] == 'cp':
                Path(args[3]).write_bytes(objects[args[2].split('/', 3)[3]])
                return ''
            if args[1] == 'delete-object':
                key = args[args.index('--key') + 1]
                if key.endswith('.complete.json'):
                    self.assertNotIn(key.removesuffix('.complete.json'), objects)
                del objects[key]
                return '{}'
            raise AssertionError(args)
        with tempfile.TemporaryDirectory() as temp, patch.object(backup, 's3', side_effect=s3):
            self.assertEqual(backup.prune(Path(temp)), 8)
        self.assertIn(orphan, objects)
        self.assertIn(stale, objects)

    def test_malformed_marker_aborts_before_any_deletion(self):
        runner = load('runner')
        backup = runner.Backup(ENV)
        key = 'lostopedia/database/20261001T000000Z-1-1.tar.age'
        def s3(args, output=None):
            if args[1] == 'list-objects-v2':
                return json.dumps({'Contents': [{'Key': key, 'Size': 3}, {'Key': key + '.complete.json', 'Size': 100}]})
            if args[1] == 'cp':
                Path(args[3]).write_text(json.dumps({'key': 'foreign', 'size': 3, 'sha256': 'a' * 64}))
                return ''
            raise AssertionError('No delete allowed after malformed marker')
        with tempfile.TemporaryDirectory() as temp, patch.object(backup, 's3', side_effect=s3):
            with self.assertRaises(runner.BackupError):
                backup.prune(Path(temp))


if __name__ == '__main__':
    unittest.main()
