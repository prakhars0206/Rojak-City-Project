'''
Module for fetching air quality data from an external API.
'''
from dotenv import load_dotenv
import os
import asyncio
import aiohttp


load_dotenv()
API_KEY = os.getenv("AIR_QUALITY_API_KEY")

class AirQualityFetcher:
    def __init__(self):
        self.base_url = "https://api.openaq.org/v3/locations"  # or whatever your URL is
        self.coordinates = "55.9533,-3.1883"  # Edinburgh coordinates


    async def fetch_air_quality(self):  # Add 'async' here
        """Fetch current air quality data from OpenAQ API"""
        params = {
            "coordinates": self.coordinates,
            "radius": 15000  # 15 km radius
            #"parameters[]": ["pm25", "pm10", "no2", "o3", "so2", "co"],
            #"limit": 10
        }
        headers = {"x-api-key": API_KEY}

        # Use aiohttp instead of requests
        async with aiohttp.ClientSession() as session:
            async with session.get(self.base_url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()  # Note: await here
                    results = []

                    for air_quality in data.get("results", []):
                        results.append({
                            "id": air_quality.get("id"),
                            "name": air_quality.get("name"),
                            "locality": air_quality.get("locality"),
                            "parameters": air_quality.get("parameters", [])
                        })
                    return results
                else:
                    text = await response.text()  # Note: await here too
                    print(f"Error: {response.status} - {text}")
                    return []

async def main():  # Removed async
    print("🌍 Edinburgh Air Quality Data Test")

    fetcher = AirQualityFetcher()
    print("🔄 Fetching air quality data...")

    air_quality_list = await fetcher.fetch_air_quality()

    print("\n✅ Success!\n")
    print("Data sample (first result):\n")

    print(air_quality_list)



if __name__ == "__main__":
    asyncio.run(main())