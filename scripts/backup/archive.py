"""Validate logical-export coverage and package private recovery material."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tarfile


PLATFORM_SCHEMAS = {
    'information_schema', 'extensions', 'realtime', 'supabase_functions', 'vault',
    'pgsodium', 'pgsodium_masks', 'graphql', 'graphql_public', 'net', 'cron',
    'pgbouncer', '_realtime', '_analytics', '_supavisor', 'pgtle', 'repack',
    'tiger', 'tiger_data', 'topology', 'pgmq', 'dbdev',
}
DATA_SCHEMAS = {'public', 'private', 'auth', 'storage', 'supabase_migrations'}
REQUIRED_MEMBERS = {'roles.sql', 'schema.sql', 'managed-schema.sql', 'data.sql', 'inventory.json', 'organization.json'}
IDENTIFIER = r'"((?:[^"]|"")+)"'
COPY = re.compile(r'^COPY ' + IDENTIFIER + r'\.' + IDENTIFIER + r' \(.*\) FROM stdin;$')


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def validate_inventory(inventory):
    unknown = set(inventory['schemas']) - DATA_SCHEMAS - PLATFORM_SCHEMAS
    unknown = {name for name in unknown if not name.startswith('pg_')}
    if unknown:
        raise ValueError('Unreviewed database schemas; review backup coverage privately')
    tables = {(t['schema'], t['name']) for t in inventory['tables']}
    if not {('auth', 'users'), ('auth', 'identities'), ('storage', 'buckets'),
            ('storage', 'objects'), ('public', 'users'), ('public', 'items'),
            ('public', 'campuses'), ('public', 'deployment_settings')} <= tables:
        raise ValueError('Required template/Auth/Storage tables are missing')
    return tables


def covered_tables(path):
    tables = set()
    in_copy = False
    complete = False
    with path.open(encoding='utf-8') as stream:
        for line in stream:
            line = line.rstrip('\n')
            if in_copy:
                if line == r'\.':
                    in_copy = False
                continue
            match = COPY.fullmatch(line)
            if match:
                table = tuple(value.replace('""', '"') for value in match.groups())
                if table in tables:
                    raise ValueError('Duplicate table data section')
                tables.add(table)
                in_copy = True
            elif line == '-- PostgreSQL database dump complete':
                complete = True
    if in_copy or not complete:
        raise ValueError('Truncated PostgreSQL data export')
    return tables


def build(input_dir, output, metadata):
    source = Path(input_dir)
    files = []
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlinks are not permitted in backup material')
        relative = path.relative_to(source).as_posix()
        if path.is_file() and (relative.startswith('migrations/') or relative in {
            'roles.sql', 'schema.sql', 'data.sql', 'managed-schema.sql',
            'migration-schema.sql', 'inventory.json', 'tools.json', 'organization.json',
        }):
            files.append(path)
    names = {p.relative_to(source).as_posix() for p in files}
    if not REQUIRED_MEMBERS <= names:
        raise ValueError('Required backup member missing')
    if any(path.stat().st_size == 0 for path in files):
        raise ValueError('Empty backup member')
    inventory = json.loads((source / 'inventory.json').read_text())
    expected = validate_inventory(inventory)
    if not expected <= covered_tables(source / 'data.sql'):
        raise ValueError('Data export is missing expected tables (including empty tables)')
    manifest = dict(metadata, format_version=1, covered_tables=inventory['tables'],
                    excluded=['storage object bytes', 'project secrets/settings'],
                    members={p.relative_to(source).as_posix(): sha256(p) for p in files})
    manifest_path = source / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    with tarfile.open(output, 'w:gz') as archive:
        for path in files + [manifest_path]:
            archive.add(path, arcname=path.relative_to(source).as_posix(), recursive=False)


def verify(input_dir):
    root = Path(input_dir).resolve()
    manifest = json.loads((root / 'manifest.json').read_text())
    if manifest['format_version'] != 1 or not REQUIRED_MEMBERS <= manifest['members'].keys():
        raise ValueError('Unsupported/empty manifest')
    for name, checksum in manifest['members'].items():
        path = root / name
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError('Unsafe manifest path')
        if not path.is_file() or sha256(path) != checksum:
            raise ValueError('Backup checksum mismatch')
    expected = validate_inventory(json.loads((root / 'inventory.json').read_text()))
    if expected != {(t['schema'], t['name']) for t in manifest['covered_tables']}:
        raise ValueError('Manifest and source inventory coverage differ')
    if not expected <= covered_tables(root / 'data.sql'):
        raise ValueError('Restored export coverage mismatch')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['verify'])
    parser.add_argument('--input-dir', required=True)
    args = parser.parse_args()
    verify(args.input_dir)
    print('Manifest and data coverage verified; this is not a restore test.')
