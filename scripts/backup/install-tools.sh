#!/usr/bin/env bash
# Ubuntu 24.04 x86_64 GitHub runner only. No production secrets are needed here.
set -euo pipefail
umask 077
[[ "$(uname -s)-$(uname -m)" == Linux-x86_64 ]]
: "${RUNNER_TEMP:?Run on a GitHub-hosted Ubuntu runner}"
: "${GITHUB_PATH:?Missing GitHub runner path file}"
tools="$RUNNER_TEMP/lostopedia-backup-tools"
mkdir -p "$tools/bin" "$tools/downloads"

download() {
  local url="$1" file="$2" checksum="$3"
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location --retry 3 "$url" -o "$file"
  printf '%s  %s\n' "$checksum" "$file" | sha256sum --check --status
}

# SHA256 values obtained from official release downloads on 2026-10-29.
# Supabase additionally publishes its release checksums. Review pins together.
download 'https://github.com/supabase/cli/releases/download/v2.75.0/supabase_linux_amd64.tar.gz' \
  "$tools/downloads/supabase.tar.gz" 'e5597462f865d5ac72af0453358e37ecb0d85962ad6914a114a53de847303bde'
tar -xzf "$tools/downloads/supabase.tar.gz" -C "$tools/bin" supabase
download 'https://github.com/FiloSottile/age/releases/download/v1.2.1/age-v1.2.1-linux-amd64.tar.gz' \
  "$tools/downloads/age.tar.gz" '7df45a6cc87d4da11cc03a539a7470c15b1041ab2b396af088fe9990f7c79d50'
tar -xzf "$tools/downloads/age.tar.gz" -C "$tools" age/age age/age-keygen
ln -sf "$tools/age/age" "$tools/bin/age"
ln -sf "$tools/age/age-keygen" "$tools/bin/age-keygen"
download 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.32.11.zip' \
  "$tools/downloads/aws.zip" 'b4ccaf7d378c6e198ee1d4d461723dd2c4ef27243fd5eff12a576f2506dcec07'
unzip -q "$tools/downloads/aws.zip" -d "$tools/downloads"
"$tools/downloads/aws/install" --install-dir "$tools/aws-cli" --bin-dir "$tools/bin"

# APT verifies repository metadata/package signatures. Pin the PG major/minor;
# shared-library dependencies still receive signed distro security updates.
download 'https://www.postgresql.org/media/keys/ACCC4CF8.asc' \
  "$tools/downloads/pgdg.asc" '0144068502a1eddd2a0280ede10ef607d1ec592ce819940991203941564e8e76'
sudo install -m 644 "$tools/downloads/pgdg.asc" /usr/share/keyrings/lostopedia-pgdg.asc
# Hosted images may already configure PGDG with another Signed-By path. Reuse
# that signed repository rather than adding a conflicting duplicate definition.
if ! python3 - <<'PY'
from pathlib import Path
import sys
paths = [Path('/etc/apt/sources.list'), *Path('/etc/apt/sources.list.d').glob('*.list'),
         *Path('/etc/apt/sources.list.d').glob('*.sources')]
configured = any('apt.postgresql.org/pub/repos/apt' in line
                 for path in paths if path.is_file()
                 for line in path.read_text().splitlines() if not line.lstrip().startswith('#'))
sys.exit(0 if configured else 1)
PY
then
  printf '%s\n' 'deb [signed-by=/usr/share/keyrings/lostopedia-pgdg.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main' \
    | sudo tee /etc/apt/sources.list.d/lostopedia-pgdg.list > /dev/null
fi
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends 'postgresql-client-17=17.11-1.pgdg24.04+2'
for tool in pg_dump pg_dumpall psql; do
  ln -sf "/usr/lib/postgresql/17/bin/$tool" "$tools/bin/$tool"
done
printf '%s\n' "$tools/bin" >> "$GITHUB_PATH"
"$tools/bin/supabase" --version
"$tools/bin/pg_dump" --version
"$tools/bin/age" --version
"$tools/bin/aws" --version
