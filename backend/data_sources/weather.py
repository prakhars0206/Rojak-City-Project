"""
Weather data fetcher for Edinburgh using Open-Meteo API

"""

import httpx
import asyncio
from datetime import datetime


class WeatherFetcher:
    """Fetches weather data for Edinburgh"""
    
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.lat = 55.9533  # Edinburgh coords
        self.lon = -3.1883
    
    async def fetch_weather(self):
        # get current weather data
        params = {
            'latitude': self.lat,
            'longitude': self.lon,
            'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m',
            'timezone': 'Europe/London'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params, timeout=10)
            data = response.json()
            
            current = data['current']
            
            # Map weather codes to descriptions
            weather_map = {
                0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy',
                3: 'Overcast', 45: 'Foggy', 51: 'Light drizzle',
                61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
                71: 'Light snow', 95: 'Thunderstorm'
            }
            
            weather_code = current['weather_code']
            description = weather_map.get(weather_code, 'Unknown')
            
            return {
                'timestamp': datetime.now().isoformat(),
                'temperature': current['temperature_2m'],
                'feels_like': current['apparent_temperature'],
                'humidity': current['relative_humidity_2m'],
                'description': description,
                'wind_speed': current['wind_speed_10m'],
                'cloudiness': current['cloud_cover']
            }
    
    def calculate_score(self, weather):
        """Convert weather to 0-100 score"""
        temp = weather['temperature']
        
        # Temp score (15-22°C is optimal for Edinburgh)
        if 15 <= temp <= 22:
            temp_score = 100
        elif temp < 15:
            temp_score = max(0, 100 - (15 - temp) * 8)
        else:
            temp_score = max(0, 100 - (temp - 22) * 5)
        
        # Cloud score
        cloud_score = 100 - (weather['cloudiness'] * 0.5)
        
        # Wind score
        wind = weather['wind_speed']
        wind_score = max(0, 100 - wind * 3)
        
        # Weighted average
        score = (temp_score * 0.4 + cloud_score * 0.3 + wind_score * 0.3)
        return round(score, 1)


async def main():

    # test
    print("🌍 Edinburgh Weather Test")
    print("=" * 50)
    
    fetcher = WeatherFetcher()
    print("🔄 Fetching weather...")
    
    weather = await fetcher.fetch_weather()
    score = fetcher.calculate_score(weather)
    
    print("\n✅ Success!\n")
    print(f"🌡️  Temperature: {weather['temperature']}°C")
    print(f"🤚 Feels like: {weather['feels_like']}°C")
    print(f"📝 Conditions: {weather['description']}")
    print(f"💨 Wind: {weather['wind_speed']} km/h")
    print(f"💧 Humidity: {weather['humidity']}%")
    print(f"☁️  Clouds: {weather['cloudiness']}%")
    print(f"\n📊 Weather Score: {score}/100")


if __name__ == "__main__":
    asyncio.run(main())