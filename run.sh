#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

if [ ! -d ".venv" ]; then
  echo "Creating venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt

mkdir -p in out

echo "Running background removal..."
python bulk_remove_bg.py --square --size 1024 --trim --matte 2

echo "✅ Finished. Check ./out"
