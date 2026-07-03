#!/bin/sh
set -e

# Allow one-off commands (e.g. `kamal app exec 'deno task db:seed'`) to bypass
# the migrate+serve flow entirely, instead of being silently ignored.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Running database migrations..."
deno task migrate:run
echo "Migrations complete."

echo "Starting application..."
exec deno run --allow-all src/main.ts
