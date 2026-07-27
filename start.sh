#!/bin/sh
set -e

export FLASK_APP=app.py

echo "Running database migrations..."
flask db upgrade

echo "Starting Gunicorn..."
exec gunicorn \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --bind 0.0.0.0:${PORT} \
    app:app