from data_sources.gilmerton_road_traffic import TrafficFetcherGilmertonRoad
from data_sources.lady_road_traffic import TrafficFetcherLadyRoad
from data_sources.nicolson_st_traffic import TrafficFetcherNicolsonSt
from data_sources.portobello_high_st_traffic import TrafficFetcherPortobelloHighSt
from data_sources.edi_airport_traffic import TrafficFetcherEdiAirport
from data_sources.princes_st_traffic import TrafficFetcherPrincesSt

class TrafficPredictor:
    """Predicts traffic conditions based on historical and real-time data"""

    def __init__(self, api_key: str):
        self.princes_st_fetcher = TrafficFetcherPrincesSt(api_key)
        self.edi_airport_fetcher = TrafficFetcherEdiAirport(api_key)
        self.portobello_high_st_fetcher = TrafficFetcherPortobelloHighSt(api_key)
        self.nicolson_st_fetcher = TrafficFetcherNicolsonSt(api_key)
        self.lady_road_fetcher = TrafficFetcherLadyRoad(api_key)
        self.gilmerton_road_fetcher = TrafficFetcherGilmertonRoad(api_key)

    async def fetch_traffic_princes_st_data(self):
        """Fetch current traffic data for Princes Street"""
        traffic = await self.princes_st_fetcher.fetch_traffic_princes_st()
        score = self.princes_st_fetcher.calculate_score(traffic)
        traffic["score"] = score
        return traffic