import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.inventory = {
            'server_version': '17.6', 'schemas': ['public', 'auth', 'storage'],
            'tables': [{'schema': s, 'name': t} for s, t in [
                ('auth', 'users'), ('auth', 'identities'), ('public', 'empty'),
                ('public', 'a "quoted" 名称'), ('public', 'users'), ('public', 'items'),
                ('public', 'campuses'), ('public', 'deployment_settings'),
                ('storage', 'buckets'), ('storage', 'objects')]],
            'excluded_tables': [], 'extensions': [],
        }
        for name in ['roles.sql', 'schema.sql', 'managed-schema.sql']:
            (self.path / name).write_text('-- synthetic schema\n')
        (self.path / 'organization.json').write_text('{"name": "Example Community"}\n')
        (self.path / 'inventory.json').write_text(json.dumps(self.inventory))
        (self.path / 'data.sql').write_text(
            'COPY "auth"."users" ("id") FROM stdin;\nuser-1\n\\.\n'
            'COPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."empty" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."a ""quoted"" 名称" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."users" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."items" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."campuses" ("id") FROM stdin;\n\\.\n'
            'COPY "public"."deployment_settings" ("id") FROM stdin;\n\\.\n'
            'COPY "storage"."buckets" ("id") FROM stdin;\n\\.\n'
            'COPY "storage"."objects" ("id") FROM stdin;\n\\.\n'
            '-- PostgreSQL database dump complete\n')

    def test_archive_preserves_empty_tables_and_quoted_names(self):
        output = self.path / 'out.tar.gz'
        load('archive').build(self.path, output, {'commit': 'test'})
        with tarfile.open(output) as archive:
            manifest = json.load(archive.extractfile('manifest.json'))
            self.assertEqual(manifest['format_version'], 1)
            self.assertEqual(len(manifest['covered_tables']), 10)
            self.assertIn('data.sql', manifest['members'])
            self.assertEqual(manifest['excluded'], ['storage object bytes', 'project secrets/settings'])

    def test_private_schema_is_supported_without_allowing_unreviewed_schemas(self):
        inventory = self.inventory | {'schemas': self.inventory['schemas'] + ['private']}
        try:
            load('archive').validate_inventory(inventory)
        except ValueError as error:
            self.fail(f'Template private schema must be supported: {error}')

    def test_missing_organization_settings_are_rejected(self):
        archive = load('archive')
        for name in ['campuses', 'deployment_settings']:
            with self.subTest(table=name):
                tables = [t for t in self.inventory['tables'] if t['name'] != name]
                with self.assertRaises(ValueError):
                    archive.validate_inventory(self.inventory | {'tables': tables})

    def test_organization_configuration_is_required_and_checksummed(self):
        archive = load('archive')
        output = self.path / 'out.tar.gz'
        archive.build(self.path, output, {'commit': 'test'})
        with tarfile.open(output) as tar:
            self.assertIn('organization.json', tar.getnames())
        (self.path / 'organization.json').write_text('{"tampered": true}')
        with self.assertRaises(ValueError):
            archive.verify(self.path)
        (self.path / 'organization.json').unlink()
        with self.assertRaises(ValueError):
            archive.build(self.path, output, {})

    def test_missing_auth_and_missing_empty_table_fail_closed(self):
        for table in ['users', 'empty']:
            with self.subTest(table=table):
                original = (self.path / 'data.sql').read_text()
                (self.path / 'data.sql').write_text(original.replace(f'."{table}"', '."other"'))
                with self.assertRaises(ValueError):
                    load('archive').build(self.path, self.path / 'out', {})
                (self.path / 'data.sql').write_text(original)

    def test_copy_text_inside_a_row_does_not_fake_coverage(self):
        data = self.path / 'data.sql'
        data.write_text('COPY "auth"."users" ("id") FROM stdin;\n'
                        'COPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
                        '-- PostgreSQL database dump complete\n')
        with self.assertRaises(ValueError):
            load('archive').build(self.path, self.path / 'out', {})

    def test_truncated_copy_and_symlink_fail_closed(self):
        data = self.path / 'data.sql'
        original = data.read_text()
        data.write_text(original.rsplit('\\.', 1)[0])
        with self.assertRaises(ValueError):
            load('archive').build(self.path, self.path / 'out', {})
        data.write_text(original)
        (self.path / 'secret-link').symlink_to(data)
        with self.assertRaises(ValueError):
            load('archive').build(self.path, self.path / 'out', {})

    def test_unexpected_schema_and_missing_mandatory_tables_fail(self):
        for change in [{'schemas': ['public', 'auth', 'storage', 'business']},
                       {'tables': [{'schema': 'public', 'name': 'empty'}]}]:
            with self.subTest(change=change):
                (self.path / 'inventory.json').write_text(json.dumps(self.inventory | change))
                with self.assertRaises(ValueError):
                    load('archive').build(self.path, self.path / 'out', {})

    def test_verification_rejects_manifest_that_omits_data_checksum(self):
        module = load('archive')
        module.build(self.path, self.path / 'out.tar.gz', {})
        manifest_path = self.path / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        del manifest['members']['data.sql']
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaises(ValueError):
            module.verify(self.path)


if __name__ == '__main__':
    unittest.main()
