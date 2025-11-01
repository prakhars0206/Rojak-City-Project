"""
Aggregates data from all sources into one unified format
Makes it easy to add new data sources
"""

from data_sources.princes_st_traffic import TrafficFetcherPrincesSt
from data_sources.liveVehicleLocation import LiveVehicleLocationFetcher
from data_sources.stops import BusStopFetcher
from data_sources.weather import WeatherFetcher
from data_sources.energy import EnergyFetcher
from datetime import datetime
from typing import Dict, Optional


class DataAggregator:
    """Combines all data sources into unified city metrics"""
    
    def __init__(self):
        # Initialize all data sources
        self.weather = WeatherFetcher()

        self.energy = EnergyFetcher()

        API_KEY = "yMoAyFyKAwwj4bE8OEFw3gfwhGPsBjVj"
        self.traffic = TrafficFetcherPrincesSt(API_KEY)

        self.liveLocation = LiveVehicleLocationFetcher()
        self.stops = BusStopFetcher()

        # Add more sources later:

        # self.social = SocialFetcher()
        
        self.last_data = None
    
    async def fetch_all_data(self) -> Dict:
        """
        Fetch from all data sources and combine
        Returns unified data structure for frontend
        """
        
        # Fetch weather (you have this working!)
        try:
            weather_data = await self.weather.fetch_weather()
            weather_score = self.weather.calculate_score(weather_data)
        except Exception as e:
            print(f"Weather error: {e}")
            weather_data = None
            weather_score = 50  # default

        try:
            energy_data = await self.energy.fetch()
            energy_score = self.energy.calculate_score(energy_data)
        except Exception as e:
            print(f"Energy error: {e}")
            energy_data = None
            energy_score = 50 # default


        # Fetch traffic
        try:
            traffic_data = await self.traffic.fetch_traffic_princes_st()
            traffic_score = self.traffic.calculate_score(traffic_data)
        except Exception as e:
            print(f"Traffic error: {e}")
            traffic_data = None
            traffic_score = 50  # fallback value

        # TODO: Add more sources here as you build them
        # social_data = await self.social.fetch()
        
        # Combine everything into one object
        combined_data = {
            'timestamp': datetime.now().isoformat(),
            
            # Weather metrics
            'weather': {
                'score': weather_score,
                'temperature': weather_data['temperature'] if weather_data else None,
                'description': weather_data['description'] if weather_data else 'Unknown',
                'raw': weather_data
            },
            'energy': {
                'score': energy_score,
                'carbon_intensity': energy_data['carbon_intensity'] if energy_data else None,
                'dominant_fuel': energy_data['dominant_fuel'] if energy_data else 'Unknown',
                'raw': energy_data
            },
            

            'traffic': {
                'score': traffic_score,
                'current_speed': traffic_data['current_speed'] if traffic_data else None,
                'free_flow_speed': traffic_data['free_flow_speed'] if traffic_data else None,
                'road_closure': traffic_data['road_closure'] if traffic_data else None,
                'raw': traffic_data
            },

            # Placeholder for future sources
            'social': {
                'score': 50,  # TODO: real data
                'mood': 50,
                'raw': None
            },
            
            # Overall city metrics (for your visualization)
            'city_pulse': {
                'mood': weather_score * 0.7 + 50 * 0.3,  # Weather affects mood
                'energy': energy_score,  # TODO: calculate from multiple sources
                'activity': traffic_score * 0.8 + weather_score * 0.2,  # TODO: calculate from transit/traffic
            }
        }
        
        self.last_data = combined_data
        return combined_data
    
    def get_last_data(self) -> Optional[Dict]:
        """Get cached data (for when frontend first connects)"""
        return self.last_data