# Edinburgh Pulse Backend

Real-time data aggregation for Edinburgh city visualization.

## Setup

### First Time Setup

```bash (Windows)
**For PowerShell:**
cd backend
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

```bash (Mac/Linux)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Running the Server
```bash
cd backend
./run.sh
```

Or manually:
```bash (Windows)
source venv/Scripts/activate
```

```bash (Mac/Linux)
source venv/bin/activate
python app.py
```

Server runs on: **http://localhost:8000**

## API Endpoints

- `GET /` - API info
- `GET /api/data` - Current city data
- `GET /api/health` - Health check
- `WS /ws` - WebSocket for real-time updates

Interactive docs: **http://localhost:8000/docs**

## Data Sources

Currently implemented:
- ✅ Weather (Open-Meteo API)

Coming soon:
- 🚌 Transit data
- 🚗 Traffic data
- 📱 Social media sentiment

## For Frontend Developers

### REST API (Initial Data)
```javascript
const response = await fetch('http://localhost:8000/api/data');
const data = await response.json();
console.log(data);
```

### WebSocket (Real-time Updates)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update visualization with data
};
```

### Data Structure
```json
{
  "timestamp": "2025-11-01T14:30:00",
  "weather": {
    "score": 65.3,
    "temperature": 8.2,
    "description": "Overcast"
  },
  "city_pulse": {
    "mood": 65,
    "energy": 60,
    "activity": 55
  }
}
```

## Adding New Data Sources

1. Create new file: `data_sources/your_source.py`
2. Implement fetcher class with `async def fetch()` method
3. Add to `aggregator.py`
4. Data automatically flows to frontend!

## Project Structure
```
backend/
├── app.py                 # FastAPI server
├── aggregator.py          # Combines all data sources
├── requirements.txt       # Python dependencies
├── run.sh                # Start script
├── config/
│   └── settings.py       # Configuration
└── data_sources/
    └── weather.py        # Weather data fetcher
```