import re
from urllib.parse import urlparse
import logging
from bs4 import BeautifulSoup
import requests
from backend.schemas import OfferVerificationResult

logger = logging.getLogger(__name__)

# Whitelist of trusted domains
TRUSTED_DOMAINS = [
    "amazon.in", "flipkart.com", "myntra.com", "bigbasket.com", "blinkit.com", "zepto.com"
]

class VerificationService:
    def __init__(self):
        # In a real app, we would load OCR models here
        pass

    def verify_url(self, url: str) -> OfferVerificationResult:
        domain = self._extract_domain(url)
        if not domain:
            return OfferVerificationResult(
                is_valid=False, confidence_score=0.0, detected_platform="Unknown", warnings=["Invalid URL"]
            )
        
        is_trusted = any(td in domain for td in TRUSTED_DOMAINS)
        if not is_trusted:
            return OfferVerificationResult(
                is_valid=False, confidence_score=10.0, detected_platform=domain, warnings=["Domain not in whitelist"]
            )
            
        # Try to scrape basic metadata
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                title = self._get_meta_content(soup, 'og:title') or soup.title.string if soup.title else ""
                # Simple price regex for demo. Real implementation needs robust selectors per site.
                price_text = self._get_meta_content(soup, 'product:price:amount') or "0.0"
                
                # Heuristic cleanup
                price = self._parse_price(price_text)
                
                return OfferVerificationResult(
                    is_valid=True,
                    confidence_score=85.0 if price > 0 else 60.0,
                    detected_platform=domain,
                    detected_title=title[:100],
                    detected_price=price,
                    warnings=[] if price > 0 else ["Could not auto-detect price"]
                )
        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            
        return OfferVerificationResult(
            is_valid=True, confidence_score=50.0, detected_platform=domain, 
            warnings=["Scraping failed, manual verification needed"]
        )

    def verify_screenshot(self, image_bytes: bytes) -> OfferVerificationResult:
        # Placeholder for OCR Logic using EasyOCR or Tesseract
        # In this environment, we simulate the AI response for reliability unless dependencies are installed
        try:
            import easyocr
            import numpy as np
            from PIL import Image
            import io
            
            reader = easyocr.Reader(['en'])
            image = Image.open(io.BytesIO(image_bytes))
            result = reader.readtext(np.array(image))
            
            text_bag = " ".join([res[1] for res in result]).lower()
            
            # Simple keyword matching
            detected_platform = "Unknown"
            for platform in ["amazon", "flipkart", "blinkit", "myntra"]:
                if platform in text_bag:
                    detected_platform = platform.capitalize()
            
            # Extract price (simple regex looking for currency symbols or numbers)
            price_match = re.search(r'(?:rs\.?|₹)\s*([\d,]+)', text_bag)
            price = 0.0
            if price_match:
                price = float(price_match.group(1).replace(",", ""))
                
            confidence = 80.0 if detected_platform != "Unknown" else 40.0
            
            return OfferVerificationResult(
                is_valid=True,
                confidence_score=confidence,
                detected_platform=detected_platform,
                detected_title="Extracted from image",
                detected_price=price,
                warnings=["OCR used - verify details"]
            )
            
        except ImportError:
            return OfferVerificationResult(
                is_valid=True, confidence_score=30.0, detected_platform="Unknown", 
                warnings=["OCR module not installed"]
            )
        except Exception as e:
             return OfferVerificationResult(
                is_valid=False, confidence_score=0.0, detected_platform="Error", 
                warnings=[str(e)]
            )

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace("www.", "")
        except:
            return ""

    def _get_meta_content(self, soup, property_name):
        tag = soup.find("meta", property=property_name)
        return tag["content"] if tag else None
        
    def _parse_price(self, text: str) -> float:
        try:
            # Remove non-numeric except .
            clean = re.sub(r'[^\d.]', '', text)
            return float(clean)
        except:
            return 0.0

verification_service = VerificationService()
