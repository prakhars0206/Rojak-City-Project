import httpx
import asyncio

class BusStopFetcher:
    """Fetches bus stop data for Edinburgh"""

    def __init__(self):
        self.base_url = "https://tfe-opendata.com/api/v1/stops"

    async def fetch_stops(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, timeout=10)
            data = response.json()

            results = []

            for vehicle in data.get("stops", []):
                stop_id = vehicle.get("stop_id")
                atco_code = vehicle.get("atco_code")
                name = vehicle.get("name")
                identifier = vehicle.get("identifier")
                locality = vehicle.get("locality")
                orientation = vehicle.get("orientation")
                direction = vehicle.get("direction")
                latitude = vehicle.get("latitude")
                longitude = vehicle.get("longitude")
                service_type = vehicle.get("service_type")
                atco_longitude = vehicle.get("atco_longitude")
                atco_latitude = vehicle.get("atco_latitude")
                destination = vehicle.get("destination", [])
                services = vehicle.get("services", [])

                results.append({
                    "stop_id": stop_id,
                    "atco_code": atco_code,
                    "name": name,
                    "identifier": identifier,
                    "locality": locality,
                    "orientation": orientation,
                    "direction": direction,
                    "latitude": latitude,
                    "longitude": longitude,
                    "service_type": service_type,
                    "atco_longitude": atco_longitude,
                    "atco_latitude": atco_latitude,
                    "destination": destination,
                    "services": services
                })

            return results
async def main():

    # test
    print("🌍 Edinburgh Bus Stops Test")

    fetcher = BusStopFetcher()
    print("🔄 Fetching Edinburgh stops...")

    vehicles = await fetcher.fetch_stops()

    print("\n✅ Success!\n")
    print("Data sample:\n")
    print(vehicles[:5])

if __name__ == "__main__":
    asyncio.run(main())