#!/bin/bash
# Exit on error
set -o errexit

# Start the application
gunicorn --workers=4 --bind=0.0.0.0:$PORT run_server:app
