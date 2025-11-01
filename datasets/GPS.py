import requests
import json
import csv
import pandas as pd

baseurl = 'https://tfe-opendata.com/api/v1/timetables/36235979'

r = requests.get(baseurl)

load = r.json()
print(load)

with open("GPS.csv", "w", newline='') as file:
    f = csv.writer(file)

    # Write header row
    f.writerow(['stop_id', 'stop_name', 'service_name', 'destination',
                'note_id', 'valid_from', 'day', 'time'])

    # Write data rows
    for departure in load['departures']:
        f.writerow([
            load['stop_id'],
            load['stop_name'],
            departure['service_name'],
            departure['destination'],
            departure['note_id'],
            departure['valid_from'],
            departure['day'],
            departure['time']
        ])
print(f"Written {len(load['departures'])} departures to GPS.csv")


