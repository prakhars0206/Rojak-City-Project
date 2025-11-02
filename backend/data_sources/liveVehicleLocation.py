'''
Fetches live vehicle location data from TFE Open Data API.
'''
import httpx
import asyncio

class LiveVehicleLocationFetcher:

    def __init__(self):
        self.base_url = "https://tfe-opendata.com/api/v1/vehicle_locations"

    async def fetch_transport(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, timeout=10)
            data = response.json()

            results = []

            for vehicle in data.get("vehicles", []):
                destination = vehicle.get("destination")
                if not destination:
                    continue
                vehicle_id = vehicle.get("vehicle_id")
                latitude = vehicle.get("latitude")
                longitude = vehicle.get("longitude")
                speed = vehicle.get("speed")
                journey_id = vehicle.get("journey_id")
                vehicle_type = vehicle.get("vehicle_type")
                heading = vehicle.get("heading")
                ineo_gps_fix = vehicle.get("ineo_gps_fix")

                results.append({
                    "vehicle_id": vehicle_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "speed": speed,
                    "destination": destination,
                    "journey_id": journey_id,
                    "vehicle_type": vehicle_type,
                    "heading": heading,
                    "ineo_gps_fix": ineo_gps_fix
                })

            return results
async def main():

    # test
    print("🌍 Edinburgh Live Vehicle Location Test")

    fetcher = LiveVehicleLocationFetcher()
    print("🔄 Fetching live vehicle locations...")

    vehicles = await fetcher.fetch_transport()

    print("\n✅ Success!\n")
    print("Data sample:\n")
    print(vehicles[:5])

if __name__ == "__main__":
    asyncio.run(main())