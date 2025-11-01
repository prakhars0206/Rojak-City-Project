"""
Aggregates data from all sources into one unified format
Makes it easy to add new data sources
"""

from data_sources.nicolson_st_traffic import TrafficFetcherNicolsonSt
from data_sources.portobello_high_st_traffic import TrafficFetcherPortobelloHighSt
from data_sources.edi_airport_traffic import TrafficFetcherEdiAirport
from data_sources.princes_st_traffic import TrafficFetcherPrincesSt
from data_sources.liveVehicleLocation import LiveVehicleLocationFetcher
from data_sources.flights import FlightFetcher
from data_sources.stops import BusStopFetcher
from data_sources.weather import WeatherFetcher
from data_sources.energy import EnergyFetcher
from datetime import datetime
from typing import Dict, Optional
import os
from dotenv import load_dotenv


load_dotenv()
class DataAggregator:
    """Combines all data sources into unified city metrics"""
    
    def __init__(self):
        # Initialize all data sources
        self.weather = WeatherFetcher()

        self.energy = EnergyFetcher()
        self.flights = FlightFetcher()


        tomtom_api_key = os.getenv("TOMTOM_API_KEY")

        if not tomtom_api_key:
            raise ValueError("TOMTOM_API_KEY not found in environment variables.")



        self.traffic_princes_st = TrafficFetcherPrincesSt(tomtom_api_key)
        self.traffic_edi_airport = TrafficFetcherEdiAirport(tomtom_api_key)
        self.traffic_portobello_high_st = TrafficFetcherPortobelloHighSt(tomtom_api_key)
        self.traffic_nicolson_st = TrafficFetcherNicolsonSt(tomtom_api_key)

        self.liveLocation = LiveVehicleLocationFetcher()
        self.stops = BusStopFetcher()

        # Add more sources later:

        # self.social = SocialFetcher()
        
        self.last_data = None
    
    async def fetch_weather_data(self):
        try:
            data = await self.weather.fetch_weather()
            score = self.weather.calculate_score(data)
            return {
                'score': score,
                'temperature': data['temperature'],
                'description': data['description'],
                'raw': data
            }
        except Exception as e:
            print(f"Weather error: {e}")
            return None

    async def fetch_energy_data(self):
        try:
            data = await self.energy.fetch()
            score = self.energy.calculate_score(data)
            return {
                'score': score,
                'carbon_intensity': data['carbon_intensity'],
                'dominant_fuel': data['dominant_fuel'],
                'raw': data
            }
        except Exception as e:
            print(f"Energy error: {e}")
            return None

    async def fetch_flight_data(self):
        try:
            data = await self.flights.fetch()
            score = self.flights.calculate_score(data)
            return {
                'score': score,
                'arriving_count': len(data['arriving']),
                'departing_count': len(data['departing']),
                'total_in_air': data['total_in_air'],
                'raw': data
            }
        except Exception as e:
            print(f"Flight error: {e}")
            return None

    async def fetch_traffic_princes_st_data(self):
        try:
            data = await self.traffic_princes_st.fetch_traffic_princes_st()
            score = self.traffic_princes_st.calculate_score(data)
            return {
                'score': score,
                'current_speed': data['current_speed'],
                'free_flow_speed': data['free_flow_speed'],
                'road_closure': data['road_closure'],
                'raw': data
            }
        except Exception as e:
            print(f"Traffic error: {e}")
            return None

    async def fetch_traffic_edi_airport_data(self):
        try:
            data = await self.traffic_edi_airport.fetch_traffic_edi_airport()
            score = self.traffic_edi_airport.calculate_score(data)
            return {
                'score': score,
                'current_speed': data['current_speed'],
                'free_flow_speed': data['free_flow_speed'],
                'road_closure': data['road_closure'],
                'raw': data
            }
        except Exception as e:
            print(f"Traffic error: {e}")
            return None

    async def fetch_traffic_portobello_high_st_data(self):
        try:
            data = await self.traffic_portobello_high_st.fetch_traffic_portobello_high_st()
            score = self.traffic_portobello_high_st.calculate_score(data)
            return {
                'score': score,
                'current_speed': data['current_speed'],
                'free_flow_speed': data['free_flow_speed'],
                'road_closure': data['road_closure'],
                'raw': data
            }
        except Exception as e:
            print(f"Traffic error: {e}")
            return None

    async def fetch_traffic_nicolson_st_data(self):
        try:
            data = await self.traffic_nicolson_st.fetch_traffic_nicolson_st()
            score = self.traffic_nicolson_st.calculate_score(data)
            return {
                'score': score,
                'current_speed': data['current_speed'],
                'free_flow_speed': data['free_flow_speed'],
                'road_closure': data['road_closure'],
                'raw': data
            }
        except Exception as e:
            print(f"Traffic error: {e}")
            return None

    async def fetch_live_transport_data(self):
        try:
            data = await self.liveLocation.fetch_transport()
            return {
                'raw': data,
                'vehicle_count': len(data) if data else 0
            }
        except Exception as e:
            print(f"Live location error: {e}")
            return None

    async def fetch_stops_data(self):
        try:
            data = await self.stops.fetch_stops()
            return {
                'raw': data,
                'stop_count': len(data) if data else 0
            }
        except Exception as e:
            print(f"Bus stops error: {e}")
            return None

    async def fetch_all_data(self) -> Dict:
        weather_data = await self.fetch_weather_data() or {}
        energy_data = await self.fetch_energy_data() or {}
        flight_data = await self.fetch_flight_data() or {}
        traffic_data = await self.fetch_traffic_data() or {}
        live_transport_data = await self.fetch_live_transport_data() or {}
        stops_data = await self.fetch_stops_data() or {}

        # Get scores for city_pulse calculation, with fallbacks
        weather_score = weather_data.get('score', 50)
        energy_score = energy_data.get('score', 50)
        traffic_score = traffic_data.get('score', 50)
        flight_score = flight_data.get('score', 0)

        combined_data = {
            'timestamp': datetime.now().isoformat(),
            'live_transport': live_transport_data,
            'stops': stops_data,
            'weather': weather_data,
            'energy': energy_data,
            'flights': flight_data,
            'princes_street_traffic': traffic_data,
            'social': {'score': 50, 'mood': 50, 'raw': None},
            'city_pulse': {
                'mood': weather_score * 0.7 + 50 * 0.3,
                'energy': energy_score,
                'activity': traffic_score * 0.55 + flight_score * 0.25 + weather_score * 0.2,
            }
        }
        
        self.last_data = combined_data
        return combined_data

    
    def get_last_data(self) -> Optional[Dict]:
        """Get cached data (for when frontend first connects)"""
        return self.last_data