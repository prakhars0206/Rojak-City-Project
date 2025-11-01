# In data_sources/flights.py

"""
Fetches live flight data for Edinburgh Airport using the OpenSky Network API.
API Docs: https://openskynetwork.github.io/opensky-api/rest.html
"""

import httpx
from datetime import datetime
from typing import Dict, Any, List

# Import the bounding box from your settings
from config.settings import EDINBURGH_AIRPORT_BBOX

class FlightFetcher:
    """Fetches real-time aircraft state vectors within a given bounding box."""

    def __init__(self):
        self.base_url = "https://opensky-network.org/api/states/all"
        self.bbox = EDINBURGH_AIRPORT_BBOX

    async def fetch(self) -> Dict[str, Any]:
        """
        Fetches and processes flight data for the Edinburgh area.
        """
        params = {
            'lamin': self.bbox[0],
            'lomin': self.bbox[1],
            'lamax': self.bbox[2],
            'lomax': self.bbox[3],
        }

        arriving_flights = []
        departing_flights = []
        en_route_flights = []
        on_ground_count = 0

        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

        # The 'states' field can be null if no aircraft are in the area
        if not data or not data['states']:
            return {
                'timestamp': datetime.now().isoformat(),
                'arriving': [],
                'departing': [],
                'en_route': [],
                'on_ground_count': 0,
                'total_in_air': 0,
            }
            
        # State vector indices used:
        # 0: icao24, 1: callsign, 5: longitude, 6: latitude, 
        # 8: on_ground, 10: true_track, 11: vertical_rate
        for state in data['states']:
            is_on_ground = state[8]
            vertical_rate = state[11] if state[11] is not None else 0
            
            if is_on_ground:
                on_ground_count += 1
                continue # Skip further processing for on-ground planes

            flight_info = {
                'callsign': state[1].strip() if state[1] else 'N/A',
                'longitude': state[5],
                'latitude': state[6],
                'vertical_rate': vertical_rate,
                'heading': state[10]
            }

            if vertical_rate < -0.5: # Descending (m/s)
                arriving_flights.append(flight_info)
            elif vertical_rate > 0.5: # Climbing (m/s)
                departing_flights.append(flight_info)
            else:
                en_route_flights.append(flight_info)

        return {
            'timestamp': datetime.now().isoformat(),
            'arriving': arriving_flights,
            'departing': departing_flights,
            'en_route': en_route_flights,
            'on_ground_count': on_ground_count,
            'total_in_air': len(arriving_flights) + len(departing_flights) + len(en_route_flights)
        }

    def calculate_score(self, flight_data: Dict[str, Any]) -> float:
        """
        Calculates a 0-100 activity score based on takeoffs and landings.
        """
        # More weight for active takeoffs/landings
        activity = (len(flight_data['arriving']) * 10 + 
                    len(flight_data['departing']) * 10 +
                    len(flight_data['en_route']) * 2)
        
        # Normalize to a 0-100 score, capping at a reasonable number (e.g., 10 planes is high activity)
        score = min(100, activity)
        return round(score, 1)