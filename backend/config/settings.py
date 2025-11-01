# Edinburgh coordinates
EDINBURGH_LAT = 55.9533
EDINBURGH_LON = -3.1883

# Update intervals (seconds)
UPDATE_INTERVAL = 30  # Fetch new data every 30 seconds

# CORS - allow your React frontend
FRONTEND_URL = "http://localhost:3000"  # React default port

# Bounding Box for Edinburgh Airport [S, W, N, E]
# (South lat, West lon, North lat, East lon)
EDINBURGH_AIRPORT_BBOX = [
    55.90,  # Min Latitude (South)
    -3.50,  # Min Longitude (West)
    56.00,  # Max Latitude (North)
    -3.30   # Max Longitude (East)
]
