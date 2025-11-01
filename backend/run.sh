#!/bin/bash

echo " Starting Edinburgh Pulse Backend..."

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -q -r requirements.txt

# Run server
python app.py