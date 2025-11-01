"""
Aggregates data from all sources into one unified format
Makes it easy to add new data sources
"""
from backend.data_sources.princes_st_traffic import TrafficFetcher
from data_sources.weather import WeatherFetcher
from datetime import datetime
from typing import Dict, Optional


class DataAggregator:
    """Combines all data sources into unified city metrics"""
    
    def __init__(self):
        # Initialize all data sources
        self.weather = WeatherFetcher()
        self.traffic = TrafficFetcher
        
        # Add more sources later:
        # self.traffic = TrafficFetcher()
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
        

        # Fetch traffic
        try:
            traffic_data = await self.traffic.fetch_traffic()
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
                'energy': 60,  # TODO: calculate from multiple sources
                'activity': traffic_score * 0.8 + weather_score * 0.2,
            }
        }
        
        self.last_data = combined_data
        return combined_data
    
    def get_last_data(self) -> Optional[Dict]:
        """Get cached data (for when frontend first connects)"""
        return self.last_data