import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from backend.schemas import OfferVerificationResult
import random
import logging
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
]

class VerificationService:
    def get_domain(self, url: str) -> str:
        domain = urlparse(url).netloc
        if "amazon" in domain:
            return "amazon"
        if "flipkart" in domain:
            return "flipkart"
        return "unknown"

    def scrape_amazon(self, url: str) -> dict:
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            # Disable SSL verify for local dev issues
            response = requests.get(url, headers=headers, timeout=10, verify=False)

            if response.status_code != 200:
                return {"error": f"Status {response.status_code}"}
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Title
            title_tag = soup.find("span", {"id": "productTitle"})
            title = title_tag.get_text().strip() if title_tag else None
            
            # Price
            price = None
            price_tag = soup.find("span", {"class": "a-price-whole"})
            if price_tag:
                price_str = price_tag.get_text().replace(",", "").replace(".", "").strip()
                if price_str.isdigit():
                    price = float(price_str)
                    
            return {"title": title, "price": price}
        except Exception as e:
            logger.error(f"Amazon Scrape Error: {e}")
            return {"error": str(e)}

    def scrape_flipkart(self, url: str) -> dict:
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            # Disable SSL verify for local dev issues
            response = requests.get(url, headers=headers, timeout=10, verify=False)

            if response.status_code != 200:
                return {"error": f"Status {response.status_code}"}
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Title
            title_tag = soup.find("span", {"class": "B_NuCI"})
            if not title_tag:
                 title_tag = soup.find("h1", {"class": "yhB1nd"})
                 
            title = title_tag.get_text().strip() if title_tag else None
            
            # Price
            price = None
            price_tag = soup.find("div", {"class": "_30jeq3 _16Jk6d"})
            if price_tag:
                price_str = price_tag.get_text().replace("₹", "").replace(",", "").strip()
                if price_str.isdigit():
                    price = float(price_str)
                    
            return {"title": title, "price": price}
        except Exception as e:
            logger.error(f"Flipkart Scrape Error: {e}")
            return {"error": str(e)}

    def verify_offer_url(self, url: str, user_price: float) -> OfferVerificationResult:
        domain = self.get_domain(url)
        
        warnings = []
        confidence = 0.0
        detected_title = None
        detected_price = None
        
        if domain == "unknown":
            warnings.append("Domain not in whitelist. Verification will be generic.")
            # We allow it but flag it for manual review (Score 10.0 -> PENDING)
            # AI Similarity matching will still work on the Title provided by user.
            return OfferVerificationResult(
                is_valid=True,
                confidence_score=10.0,
                detected_platform="unknown",
                detected_price=None,
                detected_title=None,
                warnings=warnings
            )
            
        data = {}
        if domain == "amazon":
            data = self.scrape_amazon(url)
        elif domain == "flipkart":
            data = self.scrape_flipkart(url)
        
        if "error" in data:
            warnings.append(f"Scraping failed: {data['error']}. Proceeding with manual verification.")
            # Fallback to manual review. Give enough score to pass 'is_valid' check (60.0)
            # but keep it low enough to not be 'AUTO APPROVED' (80.0)
            confidence = 65.0

        else:
            detected_title = data.get("title")
            detected_price = data.get("price")
            
            if detected_title:
                confidence += 40.0
            else:
                warnings.append("Could not extract product title.")
                
            if detected_price:
                confidence += 40.0
                # Price Check
                diff = abs(detected_price - user_price)
                percent_diff = (diff / detected_price) * 100
                
                if percent_diff <= 5.0:
                     confidence += 20.0 # Match!
                else:
                     warnings.append(f"Price Mismatch: Found ₹ {detected_price}, User entered ₹ {user_price} ({percent_diff:.1f}% diff)")
                     confidence -= 20.0
            else:
                warnings.append("Could not extract price.")
                
        return OfferVerificationResult(
            is_valid=confidence >= 60.0,
            confidence_score=max(0.0, min(100.0, confidence)),
            detected_platform=domain,
            detected_price=detected_price,
            detected_title=detected_title,
            warnings=warnings
        )

verification_service = VerificationService()
