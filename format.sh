#!/usr/bin/env bash

set -e

find . -type f -name '*.md' -print0 | while IFS= read -r -d '' file; do
  pandoc "$file" -t gfm -o "$file"
done
