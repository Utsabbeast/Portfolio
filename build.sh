#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Convert static files
python portfolio/manage.py collectstatic --no-input

# Apply any outstanding database migrations
python portfolio/manage.py migrate
