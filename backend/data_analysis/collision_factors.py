import pandas as pd

# Load both CSV files
df_speed = pd.read_csv("ras0301_speed_limit_collisions.csv")
df_factors = pd.read_csv("ras0701_collision_number_factors.csv")

print(df_factors.columns.tolist())
# Define the factors you care about
selected_factors = [
    "Road surface was slippery due to weather",
    "Driver or rider vision affected by adverse weather or dazzling sun",
    "Driver or rider exceeding speed limit"
]


# Clean text just in case there are hidden spaces or encoding differences
df_factors.columns = df_factors.columns.str.strip()


# Filter ras0701 for those factors only
df_selected_factors = df_factors[df_factors["Road safety factor [note 1]"].isin(selected_factors)]


# Preview the result
print("\n✅ Speed Limit DataFrame:")
print(df_speed.head())

print("\n✅ Collision Factors DataFrame:")
print(df_selected_factors.head())

