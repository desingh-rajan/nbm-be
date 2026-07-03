#!/bin/sh
set -e

echo "Running database migrations..."
deno task migrate:run
echo "Migrations complete."

echo "Starting application..."
exec deno run --allow-all src/main.ts
