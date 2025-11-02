"""
Train an air-quality prediction model using historical weather + pollutant data.
"""

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error
import joblib
from xgboost import XGBRegressor
from xgboost import plot_importance

print("📂 Loading data...")

# Load weather data with low_memory=False to handle mixed types
weather = pd.read_csv("midas-open_uk-hourly-weather-2023.csv")
weather.columns = weather.columns.str.strip()  # Clean column names

print(f"Weather columns: {weather.columns.tolist()}")

if "timestamp" not in weather.columns:
    weather["timestamp"] = pd.date_range(start="2023-01-01", periods=len(weather), freq="h")

weather["timestamp"] = pd.to_datetime(weather["timestamp"], errors="coerce")

# Check which columns exist BEFORE resampling
required_cols = ["air_temperature", "dewpoint", "wetb_temp", "rltv_hum", "wind_speed", "wind_direction", "visibility", "msl_pressre",
                 "stn_pres"]
available_cols = [col for col in required_cols if col in weather.columns]
print(f"Available weather columns: {available_cols}")

# Select only the columns you need (including timestamp)
weather = weather[["timestamp"] + available_cols].copy()

# Convert all weather columns to numeric (in case they're stored as strings)
for col in available_cols:
    weather[col] = pd.to_numeric(weather[col], errors='coerce')

# Drop rows with NaN in required columns
weather = weather.dropna()

print(f"Weather data shape after cleaning: {weather.shape}")

# Set timestamp as index for resampling
weather = weather.set_index('timestamp')
daily_weather = weather.resample('D').mean().reset_index()  # 'D' = daily frequency
daily_weather = daily_weather.rename(columns={'timestamp': 'date'})
daily_weather["date"] = pd.to_datetime(daily_weather["date"], format="%Y-%m-%d", errors="coerce")


print(f"\nDaily weather shape: {daily_weather.shape}")
print(daily_weather.head())

# Load pollutant data
pollutant = pd.read_csv("pollutant-2023.csv")
pollutant.columns = pollutant.columns.str.strip()
target_col = "PM2.5 particulate matter (Hourly measured)"
pollutant["date"] = pd.to_datetime(pollutant["date"], format="%d/%m/%Y", errors="coerce")
print(pollutant.head())

# Find timestamp column
time_cols = [c for c in pollutant.columns if "time" in c.lower() or "date" in c.lower()]
print(f"Found time columns: {time_cols}")

if len(time_cols) > 0:
    pollutant["timestamp"] = pd.to_datetime(pollutant[time_cols[0]], errors="coerce")
else:
    raise ValueError("No timestamp column found in pollutant data!")

if target_col not in pollutant.columns:
    print(f"\n❌ Target column '{target_col}' not found!")
    print("Available pollutant columns:", pollutant.columns.tolist())
    raise ValueError(f"Column '{target_col}' not in dataset")

# Convert target to numeric
pollutant[target_col] = pd.to_numeric(pollutant[target_col], errors='coerce')

# Keep only what you need
print(f"\nPollutant missing values before dropna:")
print(pollutant[["timestamp", target_col]].isna().sum())
print(f"Pollutant data shape before cleaning: {pollutant.shape}")

pollutant = pollutant[["timestamp", target_col]].dropna()
print(f"Pollutant data shape after cleaning: {pollutant.shape}")

# Aggregate pollutant to daily as well
pollutant['date'] = pollutant['timestamp'].dt.date
daily_pollutant = pollutant.groupby('date')[target_col].mean().reset_index()
daily_pollutant['date'] = pd.to_datetime(daily_pollutant['date'])

print(f"Daily pollutant shape: {daily_pollutant.shape}")

# Merge daily data
print("\n🔗 Merging datasets...")
merged = pd.merge(
    daily_weather,
    daily_pollutant,
    on="date",
    how="inner"  # Use inner to keep only matching dates
)

print(f"Merged shape: {merged.shape}")
print(f"Missing values:\n{merged.isna().sum()}")

if len(merged) == 0:
    raise ValueError("No data after merge! Check date ranges overlap.")

# Split data
X = merged[available_cols]
y = merged[target_col]

print(f"\n✅ Final dataset: {len(merged)} rows")
print(f"X shape: {X.shape}, y shape: {y.shape}")

# Train model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\n🤖 Training model...")
print("\n Random Forest")
model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

print("\nGradient Boosting")
model1 = XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6)
model1.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print("\n📊 Model performance:")
print(f"  R²:  {r2_score(y_test, y_pred):.3f}")
print(f"  MAE: {mean_absolute_error(y_test, y_pred):.3f}")

y_pred_XGB = model1.predict(X_test)
print("\n📊 XGB Model performance:")
print(f"  R²:  {r2_score(y_test, y_pred_XGB):.3f}")
print(f"  MAE: {mean_absolute_error(y_test, y_pred_XGB):.3f}")

# Save model
joblib.dump(model, "air_quality_model.pkl")
print("\n📦 Model saved as air_quality_model.pkl")