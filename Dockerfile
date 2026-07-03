FROM denoland/deno:alpine-2.0.0

# Set working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY deno.json deno.lock* ./

# Cache dependencies 
RUN deno cache --lock=deno.lock deno.json

# Copy source code
COPY . .

# Cache the main application
RUN deno cache src/main.ts

# Pre-cache migration dependencies so entrypoint is fast
RUN deno cache scripts/migrate-run.ts

# Ensure entrypoint is executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 8000

# Add healthcheck with longer start-period for cold start + migration time
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=5 \
  CMD deno eval --allow-net "try { const res = await fetch('http://localhost:8000/health'); Deno.exit(res.ok ? 0 : 1); } catch { Deno.exit(1); }"

# Entrypoint runs migrations then starts the app
ENTRYPOINT ["/app/docker-entrypoint.sh"]