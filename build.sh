#!/bin/bash
# Exit on error
set -o errexit

pip install -r requirements.txt

# Inform Render that the build was successful
echo "Build completed successfully!"
