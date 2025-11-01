"""
Real-time Traffic Data Fetcher for Edinburgh Airport
Using TomTom Traffic API
"""

import httpx
import asyncio
from datetime import datetime


class TrafficFetcherLadyRoad:
    """Fetches real-time traffic data for Lady Road"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        self.lat = 55.92822555522985
        self.lon = -3.164388515317342

    async def fetch_traffic_lady_road(self):
        """Fetch current traffic data from TomTom API"""
        params = {
            "point": f"{self.lat},{self.lon}",
            "unit": "KMPH",
            "key": self.api_key
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            segment = data["flowSegmentData"]

            return {
                "timestamp": datetime.now().isoformat(),
                "current_speed": segment["currentSpeed"],
                "free_flow_speed": segment["freeFlowSpeed"],
                "current_travel_time": segment["currentTravelTime"],
                "free_flow_travel_time": segment["freeFlowTravelTime"],
                "confidence": segment["confidence"],
                "road_closure": segment["roadClosure"]
            }

    def calculate_score(self, traffic):
        """Convert traffic data to 0–100 score (higher = smoother traffic)"""
        if traffic["road_closure"]:
            return 0  # full closure = 0 score

        current = traffic["current_speed"]
        free = traffic["free_flow_speed"]

        # Basic ratio of flow efficiency
        ratio = current / free if free > 0 else 0
        ratio = min(max(ratio, 0), 1)

        # Add confidence weighting
        score = ratio * 100 * traffic["confidence"]
        return round(score, 1)


async def main():
    print("🚦 Lady RoadTraffic Test")
    print("=" * 50)

    API_KEY = "yMoAyFyKAwwj4bE8OEFw3gfwhGPsBjVj"  # Replace with your own key
    fetcher = TrafficFetcherLadyRoad(API_KEY)

    print("🔄 Fetching real-time traffic data...")
    traffic = await fetcher.fetch_traffic_lady_road()
    score = fetcher.calculate_score(traffic)

    print("\n✅ Success!\n")
    print(f"🚗 Current Speed: {traffic['current_speed']} km/h")
    print(f"🛣️  Free Flow Speed: {traffic['free_flow_speed']} km/h")
    print(f"⏱️  Travel Time: {traffic['current_travel_time']} sec")
    print(f"⚙️  Confidence: {traffic['confidence'] * 100}%")
    print(f"🚫 Road Closed: {traffic['road_closure']}")
    print(f"\n📊 Traffic Flow Score: {score}/100")


if __name__ == "__main__":
    asyncio.run(main())