#!/bin/bash

print_error() {
    echo "Error: $1"
    exit 1
}

FUNCTIONS_PATH="$PWD/functions"
[ -d "$FUNCTIONS_PATH" ] || print_error "Functions directory not found at $FUNCTIONS_PATH"

for file in "$FUNCTIONS_PATH"/*.py; do
    [ -f "$file" ] || continue

    filename=$(basename "$file")
    basename="${filename%.py}"
    zip_path="$FUNCTIONS_PATH/${basename}.zip"

    if [ -f "$zip_path" ] && [ ! "$file" -nt "$zip_path" ]; then
        echo "Skipping: $file (zip is up to date)"
        continue
    fi

    echo "Processing: $file"

    temp_dir=$(mktemp -d)
    cp "$file" "$temp_dir/$filename"

    pushd "$temp_dir" &>/dev/null
    zip -q "$zip_path" "$filename" || echo "Error: Failed to create ZIP for $filename"
    rm -rf "$temp_dir"
    popd &>/dev/null
done
