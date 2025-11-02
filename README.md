# EdinPulse: Edinburgh's Living Heart

EdinPulse is a full-stack application that re-imagines Edinburgh as a living, breathing organism. It achieves this through two core components: a real-time 3D visualization of the city's "heart" and a quantitative prediction engine that forecasts traffic congestion events.

This project was developed for the G-Research Hackathon, with a focus on demonstrating **creativity in visualization** and **quality of data handling** in a real-time, predictive system.

## Project Architecture

The application is a classic client-server model composed of a Python backend and a React frontend.

*   **Backend:** A high-performance FastAPI server responsible for aggregating multiple streams of data, running a prediction engine, and serving the processed data via a REST API.
*   **Frontend:** A dynamic React application that renders a live 3D anatomical heart using Three.js (React Three Fiber) and displays a dashboard of real-time city vitals and traffic predictions.

---

## Backend Technical Details

The backend is the data processing and intelligence core of the project.

### Core Technologies
-   **Language:** Python 3.10+
-   **Web Framework:** **FastAPI**
    -   Chosen for its high performance and native `asyncio` support, allowing for efficient, non-blocking handling of numerous concurrent API calls to external data providers.
-   **ASGI Server:** **Uvicorn**
    -   The server that runs our FastAPI application.
-   **Key Libraries:**
    -   `httpx`: A modern, fully asynchronous HTTP client used for all external API calls.
    -   `python-dotenv`: For securely managing API keys via a `.env` file.
    -   `statistics`: Used by the prediction engine to calculate `mean` and `stdev`.

### Key Modules
1.  **`aggregator.py` (Data Fusion Hub):**
    -   Orchestrates the fetching of all live data streams.
    -   Asynchronously calls each data source, normalizes the raw data into a consistent 0-100 score, and fuses it into a single "city state" JSON object.
    -   Triggers the prediction engine on each cycle with the newly aggregated data.

2.  **`predictor_engine.py` (The "Brain"):**
    -   A "G-Research style" quantitative model for real-time traffic anomaly detection.
    -   **Technique:** It uses **live baselining**, requiring no static historical data. It maintains a **60-minute rolling window** of traffic scores for 7 key city arteries to learn an adaptive "normal" for the current time of day.
    -   **Anomaly Detection:** It flags a statistically significant event when a live traffic score drops more than a tunable threshold (e.g., 2.0 standard deviations) below the rolling average.
    -   **Explainable AI (XAI):** The model is a transparent heuristic. It classifies events as "Minor" or "Major," predicts an estimated duration, and calculates a **dynamic confidence score** that is directly proportional to the magnitude of the statistical anomaly.

### Data Sources
-   **TomTom Traffic API:** Real-time traffic flow for 7 key locations.
-   **National Grid ESO:** Real-time UK carbon intensity.
-   **Transport for Edinburgh (TfE):** Live bus and tram locations.
-   **Open-Meteo:** Live weather conditions.

---

## Frontend Technical Details

The frontend is responsible for the creative visualization and user interface.

### Core Technologies
-   **Framework:** **React 18**
-   **3D Graphics:** **Three.js** via **React Three Fiber** and **Drei**
    -   React Three Fiber allows us to build a declarative, component-based 3D scene, making it easy to manage complex animations and tie them to React state.
-   **Styling:** **Tailwind CSS** for rapid, utility-first UI development.
-   **Language:** JavaScript (ES6+) with JSX.

### Key Components
1.  **`AnatomicalHeart.jsx` (The Visualization):**
    -   Loads a GLB 3D model of a heart and renders it as a wireframe.
    -   **Live Data Mapping:** Every visual element is driven by data:
        -   **Heartbeat (BPM):** The pulse speed is controlled by a multi-factor model from the backend.
        -   **Artery Flow:** A particle system's speed and density are mapped to real-time traffic scores.
        -   **Orb Nodes:** Glowing spheres on the heart represent traffic locations. Their size and color directly reflect live congestion levels.
    -   **Prediction Integration:** When a traffic prediction is active, the corresponding orb on the heart switches to a "stressed" pulse animation, visually connecting the prediction to the 3D model.

2.  **`App.jsx` (The Dashboard):**
    -   The main UI container.
    -   Manages the overall state of the application.
    -   Features panels displaying real-time city vitals (Weather, Energy) and the live prediction dashboard.

3.  **Custom Hooks (`useTrafficData.js`, `useCityData.js`):**
    -   These hooks encapsulate the logic for fetching data from the backend's various REST API endpoints at regular intervals. They handle state management, error handling, and data transformation for the UI components.

---

## How to Run the Project

### Backend Setup

1.  Navigate to the `backend` directory.
2.  **Create a virtual environment:** `python3 -m venv venv`
3.  **Activate it:** `source venv/bin/activate`
4.  **Install dependencies:** `pip install -r requirements.txt`
5.  **Create a `.env` file** and add your TomTom API key: `TOMTOM_API_KEY="your_key_here"`
6.  **Run the server:** `python app.py` (or `uvicorn app:app --reload` for development).

### Frontend Setup

1.  Navigate to the `frontend` directory.
2.  **Install dependencies:** `npm install`
3.  **Run the development server:** `npm run dev`
4.  The application will be available at `http://localhost:3000` (or a similar port).