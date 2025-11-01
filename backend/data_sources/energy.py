# In: data_sources/energy.py

"""
Energy consumption data fetcher for Great Britain using the National Grid ESO API.
This data serves as a proxy for Edinburgh's energy metabolism.
API Docs: https://carbon-intensity.github.io/api-definitions/
"""

import httpx
from datetime import datetime
from typing import Dict, List, Any

class EnergyFetcher:
    """Fetches electricity carbon intensity and generation mix for GB."""

    def __init__(self):
        self.base_url = "https://api.carbonintensity.org.uk"

    async def fetch_intensity(self) -> Dict[str, Any]:
        """Fetches the current carbon intensity."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/intensity", timeout=10)
            response.raise_for_status()  # Raise an exception for bad responses
            # The API returns an array, we want the first (and only) element
            return response.json()['data'][0]

    async def fetch_generation_mix(self) -> List[Dict[str, Any]]:
        """Fetches the current electricity generation mix."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/generation", timeout=10)
            response.raise_for_status()
            return response.json()['data']['generationmix']

    async def fetch(self) -> Dict[str, Any]:
        """
        Fetches both intensity and generation data and combines them.
        """
        intensity_data = await self.fetch_intensity()
        generation_mix = await self.fetch_generation_mix()

        # Find the dominant fuel source
        dominant_fuel = max(generation_mix, key=lambda x: x['perc'])

        return {
            'timestamp': datetime.now().isoformat(),
            'carbon_intensity': intensity_data['intensity']['actual'],
            'intensity_forecast': intensity_data['intensity']['forecast'],
            'intensity_index': intensity_data['intensity']['index'], # e.g., "low", "moderate"
            'generation_mix': generation_mix,
            'dominant_fuel': dominant_fuel['fuel'],
            'dominant_fuel_percentage': dominant_fuel['perc']
        }

    def calculate_score(self, energy_data: Dict[str, Any]) -> float:
        """
        Converts carbon intensity to a 0-100 score.
        Lower intensity is better, so the score is higher.
        """
        intensity = energy_data.get('carbon_intensity', 200) # Default to a moderate value

        # The scale goes from ~0 (all renewables) to ~900 (all coal).
        # We'll map this inversely. Let's say anything under 50 gCO2/kWh is "very good" (100)
        # and anything over 400 is "very bad" (0).
        
        if intensity <= 50:
            score = 100.0
        elif intensity >= 400:
            score = 0.0
        else:
            # Linear scaling for the range in between
            score = 100 * (1 - (intensity - 50) / (400 - 50))
        
        return round(score, 1)