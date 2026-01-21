import requests
import logging
import math
from typing import List, Dict, Optional, Tuple
from backend.config import settings

logger = logging.getLogger(__name__)

class LocationService:
    def __init__(self):
        self.api_key = settings.GEOAPIFY_API_KEY
        if not self.api_key:
            logger.warning("GEOAPIFY_API_KEY not found. Geocoding will fail.")

    def geocode_address(self, address: dict) -> Tuple[float, float]:
        """
        Converts structured address to (lat, lon).
        Address dict should have: street, city, state, pincode
        """
        if not self.api_key:
            logger.error("No API Key provided for geocoding")
            return (0.0, 0.0)

        # Construct query string
        # Priority: explicit structure over free text
        # But GeoApify 'text' param is robust
        query_parts = [
            address.get('street', ''),
            address.get('city', ''),
            address.get('state', ''),
            address.get('pincode', '')
        ]
        query = ", ".join([p for p in query_parts if p])
        
        url = "https://api.geoapify.com/v1/geocode/search"
        params = {
            "text": query,
            "apiKey": self.api_key,
            "limit": 1
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('features'):
                    coords = data['features'][0]['geometry']['coordinates']
                    # GeoJSON is [lon, lat]
                    return (coords[1], coords[0]) 
            else:
                logger.error(f"GeoApify Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Geocoding Exception: {e}")
            
        return (0.0, 0.0)

    def haversine_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees)
        """
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        # Convert decimal degrees to radians 
        lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

        # Haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a)) 
        r = 6371 # Radius of earth in kilometers
        return c * r

    def select_optimal_host(self, members: List[Dict]) -> str:
        """
        Selects the member who minimizes the total distance to all other members.
        Input: List of member dicts, each must have 'coordinates': (lat, lon)
        Returns: user_id of the best host
        """
        if not members:
            return None
            
        # Filter members with valid coordinates
        valid_members = [m for m in members if m.get('coordinates') and m['coordinates'] != (0.0, 0.0)]
        
        if not valid_members:
            # Fallback: Just return the first one (Creator usually)
            return members[0]['user_id']
            
        if len(valid_members) == 1:
            return valid_members[0]['user_id']

        min_total_dist = float('inf')
        best_host_id = valid_members[0]['user_id']
        
        for candidate in valid_members:
            total_dist = 0.0
            for peer in valid_members:
                if candidate['user_id'] == peer['user_id']:
                    continue
                total_dist += self.haversine_distance(candidate['coordinates'], peer['coordinates'])
            
            if total_dist < min_total_dist:
                min_total_dist = total_dist
                best_host_id = candidate['user_id']
                
        return best_host_id

location_service = LocationService()
