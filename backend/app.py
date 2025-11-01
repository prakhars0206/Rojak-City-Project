"""
FastAPI server for Edinburgh Pulse
Provides REST API and WebSocket for real-time data
"""

from contextlib import asynccontextmanager  # ← ADD THIS!
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import List
from datetime import datetime

from aggregator import DataAggregator
from config.settings import UPDATE_INTERVAL, FRONTEND_URL

# Global state
aggregator = DataAggregator()
active_connections: List[WebSocket] = []


# ==================== BACKGROUND TASK ====================

async def data_loop():
    """
    Background task: Fetch data periodically and broadcast to clients
    Runs continuously while server is up
    """
    print(f"🔄 Starting data loop (updating every {UPDATE_INTERVAL}s)")
    
    while True:
        try:
            # Fetch all data
            data = await aggregator.fetch_all_data()
            
            # Broadcast to all connected clients
            await broadcast_data(data)
            
            # Log for debugging
            weather_score = data['weather']['score']
            temp = data['weather']['temperature']

            energy_score = data['energy']['score']
            intensity = data['energy']['carbon_intensity']

            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"Weather: {temp}°C (score: {weather_score}) | "
                  f"Energy: {intensity} gCO2/kWh (score: {energy_score}) | "
                  f"Clients: {len(active_connections)}")

            
        except Exception as e:
            print(f"❌ Error in data loop: {e}")
        
        # Wait before next update
        await asyncio.sleep(UPDATE_INTERVAL)


async def broadcast_data(data: dict):
    """Send data to all connected WebSocket clients"""
    if not active_connections:
        return
    
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(data)
        except:
            disconnected.append(connection)
    
    # Remove dead connections
    for conn in disconnected:
        active_connections.remove(conn)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager - handles startup and shutdown
    """
    # Startup
    print("🚀 Server started!")
    print(f"📡 REST API: http://localhost:8000")
    print(f"🔌 WebSocket: ws://localhost:8000/ws")
    print(f"📖 Docs: http://localhost:8000/docs")
    
    # Start background task
    task = asyncio.create_task(data_loop())
    
    yield  # Server is running
    
    # Shutdown (when server stops)
    task.cancel()
    print("👋 Server shutting down...")


# Create FastAPI app WITH lifespan
app = FastAPI(title="Edinburgh Pulse API", lifespan=lifespan)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== REST ENDPOINTS ====================

@app.get("/")
async def root():
    """API info"""
    return {
        "app": "Edinburgh Pulse API",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "current_data": "/api/data",
            "health": "/api/health",
            "websocket": "/ws"
        }
    }


@app.get("/api/data")
async def get_current_data():
    """
    Get current city data
    React frontend calls this to get initial data
    """
    # If we have cached data, return it immediately
    if aggregator.get_last_data():
        return aggregator.get_last_data()
    
    # Otherwise fetch new data
    data = await aggregator.fetch_all_data()
    return data


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


# ==================== WEBSOCKET (Real-time Updates) ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time data streaming
    React frontend connects here for live updates
    """
    await websocket.accept()
    active_connections.append(websocket)
    print(f"✅ Client connected. Total connections: {len(active_connections)}")
    
    try:
        # Send initial data immediately
        if aggregator.get_last_data():
            await websocket.send_json(aggregator.get_last_data())
        
        # Keep connection alive
        while True:
            # Wait for messages from client (for keep-alive)
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                pass  # No message, that's ok
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"❌ Client disconnected. Total connections: {len(active_connections)}")


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")