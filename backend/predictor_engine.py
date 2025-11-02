# In predictor_engine.py

from datetime import datetime, timezone, timedelta
from collections import deque
import uuid
from statistics import mean, stdev

# --- State Management for our Engine ---
_predictions: dict[str, dict] = {}
_stats = {"total_validated": 0, "total_correct": 0}

# This is our "live historical model". It will store the last ~hour of traffic scores.
_historical_traffic_scores: dict[str, deque] = {}

# --- Prediction Model Configuration ---
HISTORY_LENGTH = 120 # Store 60 minutes of data (120 readings at 30s intervals)
PREDICTION_WINDOW_MINUTES = 10
ANOMALY_THRESHOLD_STD_DEV = 2 # Trigger if traffic is 2 standard deviations from the mean

MIN_STD_DEV_TO_PREDICT = 1.0


_cycle_counter = 0


def _calculate_dynamic_confidence(current_score: float, avg: float, std_dev: float) -> float:
    """Calculates a confidence score based on the severity of the anomaly."""
    if std_dev == 0:
        return 50.0 # Default confidence if there's no variation

    num_std_devs_away = (avg - current_score) / std_dev
    
    # Start with a base confidence at our trigger threshold
    base_confidence = 60.0
    
    # Add confidence for every standard deviation beyond the trigger
    # This formula adds ~15 points for each extra standard deviation of severity
    extra_confidence = (num_std_devs_away - ANOMALY_THRESHOLD_STD_DEV) * 15.0
    
    confidence = base_confidence + extra_confidence
    
    # Clamp the value between 50% and 99% for realism
    return max(50.0, min(99.0, confidence))



def _update_historical_data(agg_data: dict):
    """Updates our live in-memory historical model with the latest traffic scores."""
    for key, value in agg_data.items():
        if "traffic" in key and isinstance(value, dict) and "score" in value:
            if key not in _historical_traffic_scores:
                _historical_traffic_scores[key] = deque(maxlen=HISTORY_LENGTH)
            _historical_traffic_scores[key].append(value['score'])

def _get_historical_average(location_key: str) -> (float | None, float | None):
    if location_key in _historical_traffic_scores and len(_historical_traffic_scores[location_key]) > 10:
        scores = list(_historical_traffic_scores[location_key])
        # stdev requires at least 2 points. This prevents a rare crash.
        if len(scores) < 2:
            return mean(scores), 0.0
        return mean(scores), stdev(scores)
    return None, None

def generate_traffic_anomaly_prediction(agg_data: dict) -> dict | None:
    global _cycle_counter
    # (Debug logging is unchanged)
    if _cycle_counter % 4 == 0:
        print(f"\n----- PREDICTION ENGINE STATUS (Cycle #{_cycle_counter}) -----")
        for loc, hist in _historical_traffic_scores.items():
            road_name = loc.replace('_traffic', '').replace('_', ' ').title()
            print(f"  - {road_name}: Stored {len(hist)} historical readings.")
        print("--------------------------------------------------\n")

    for location_key, traffic_data in agg_data.items():
        if "traffic" not in location_key or not isinstance(traffic_data, dict): continue
        current_score = traffic_data.get('score')
        if current_score is None: continue
            
        avg, std_dev = _get_historical_average(location_key)

        road_name_debug = location_key.replace('_traffic', '').replace('_',' ').title()
        if avg is None or std_dev is None:
            if _cycle_counter % 4 == 0: print(f"DEBUG [{road_name_debug}]: Waiting for more historical data...")
            continue
        
        anomaly_threshold_value = avg - (ANOMALY_THRESHOLD_STD_DEV * std_dev)
        if _cycle_counter % 2 == 0: print(f"DEBUG [{road_name_debug}]: Current={current_score:.1f} | Avg={avg:.1f} | StdDev={std_dev:.1f} | Trigger Threshold: < {anomaly_threshold_value:.1f}")

        if std_dev < MIN_STD_DEV_TO_PREDICT: continue

        if current_score < anomaly_threshold_value:
            if any(p['validation_data']['location_key'] == location_key for p in _predictions.values() if p['status'] == 'active'): continue
            
            num_std_devs_away = (avg - current_score) / std_dev if std_dev > 0 else 0
            
            
            # 1. Classify Severity and set duration
            if num_std_devs_away > 3:
                severity = "Major"
                predicted_duration_mins = 30
            else: # Anything between 1.5 and 3 is Minor
                severity = "Minor"
                predicted_duration_mins = 15

            # 2. Calculate the dynamic confidence score independently
            confidence = _calculate_dynamic_confidence(current_score, avg, std_dev)
            
            road_name = location_key.replace('_traffic', '').replace('_', ' ').title()
            
            return {
                "id": f"traffic-anomaly-{uuid.uuid4()}",
                "type": "TRAFFIC_CONGESTION_EVENT",
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "validate_at": (datetime.now(timezone.utc) + timedelta(minutes=predicted_duration_mins)).isoformat(),
                "prediction_text": f"Potential {severity} Congestion on {road_name}",
                "confidence": round(confidence), # DYNAMIC value
                "severity": severity,           # "Minor" or "Major"
                "predicted_duration_mins": predicted_duration_mins,
                "target_value": f"Score to remain below {avg - std_dev:.0f}",
                "validation_data": { "location_key": location_key, "triggering_score": current_score, "historical_avg_at_prediction": avg, "validation_threshold": avg - std_dev }
            }
    return None

def validate_traffic_anomaly_prediction(prediction: dict, agg_data: dict) -> str:
    """Validates if the traffic score remained low."""
    location_key = prediction['validation_data']['location_key']
    validation_threshold = prediction['validation_data']['validation_threshold']
    
    final_score = agg_data.get(location_key, {}).get('score')
    
    if final_score is None:
        return "incorrect" # Can't validate if data is missing

    print(f"VALIDATION: {location_key}. Target was < {validation_threshold:.1f}. Actual was {final_score:.1f}.")

    if final_score < validation_threshold:
        return "correct"
    else:
        return "incorrect"

def run_prediction_cycle(agg_data: dict):
    """The main loop: update history, validate old, generate new."""
    _update_historical_data(agg_data)

    # 1. Validate finished predictions
    now_utc = datetime.now(timezone.utc)
    for pred in list(_predictions.values()): # Use list to allow modification during iteration
        if pred['status'] == 'active' and datetime.fromisoformat(pred['validate_at']) <= now_utc:
            result = validate_traffic_anomaly_prediction(pred, agg_data)
            pred['status'] = result # Update status
            _stats['total_validated'] += 1
            if result == 'correct':
                _stats['total_correct'] += 1

    # 2. Generate new predictions
    if len([p for p in _predictions.values() if p['status'] == 'active']) < 12:
        new_prediction = generate_traffic_anomaly_prediction(agg_data)
        if new_prediction:
            print(f"Generated new prediction: {new_prediction['prediction_text']}")
            _predictions[new_prediction['id']] = new_prediction

def get_live_predictions_and_stats():
    """Returns all data needed for the frontend dashboard."""
    if _stats['total_validated'] == 0:
        accuracy = 100.0
    else:
        accuracy = (_stats['total_correct'] / _stats['total_validated']) * 100
        
    return {
        "predictions": [p for p in _predictions.values() if p['status'] == 'active'],
        "stats": {
            "accuracy_percent": round(accuracy, 2),
            "correct_count": _stats['total_correct'],
            "validated_count": _stats['total_validated']
        }
    }