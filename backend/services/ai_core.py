import logging
import re
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import easyocr
import numpy as np
from PIL import Image
import io
import requests
from bs4 import BeautifulSoup
from backend.schemas import OfferVerificationResult

logger = logging.getLogger(__name__)

# Initialize Global Models (Lazy loading recommended in production, but loading here for "Real" feel)
print("Loading AI Models... This might take a moment.")
try:
    # Lightweight BERT model for sentence embeddings
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2') 
    # NOTE for User: 'all-MiniLM-L6-v2' is the best trade-off for speed/accuracy. 
    # If higher accuracy is needed at cost of speed, switch to 'all-mpnet-base-v2'.
    
    # OCR Reader
    ocr_reader = easyocr.Reader(['en']) # GPU=False if needed by environment
    MODELS_LOADED = True
except Exception as e:
    print(f"Failed to load AI models: {e}")
    MODELS_LOADED = False

class AIService:
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates semantic similarity between two product titles using BERT embeddings.
        Returns score between 0.0 and 1.0
        """
        if not MODELS_LOADED:
            return 0.5 # Fallback
            
        embedding1 = embedding_model.encode(text1, convert_to_tensor=True)
        embedding2 = embedding_model.encode(text2, convert_to_tensor=True)
        
        score = util.pytorch_cos_sim(embedding1, embedding2).item()
        return float(score)

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Uses EasyOCR to extract text from screenshot.
        """
        if not MODELS_LOADED:
            return ""
            
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to numpy for EasyOCR
            image_np = np.array(image)
            
            result = ocr_reader.readtext(image_np)
            text = " ".join([res[1] for res in result])
            return text
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return ""

    def verify_offer_intelligence(self, url: str = None, image_bytes: bytes = None) -> OfferVerificationResult:
        """
        Real AI Pipeline:
        1. Source verification
        2. Content Extraction (Scraping or OCR)
        3. Confidence Scoring based on heuristics + NLP
        """
        detected_title = "Unknown"
        detected_price = 0.0
        detected_platform = "Unknown"
        warnings = []
        confidence = 0.0
        
        # 1. URL Path
        if url:
            domain = self._extract_domain(url)
            detected_platform = domain
            if "amazon" in domain or "flipkart" in domain:
                confidence += 30
            else:
                warnings.append("Unknown Domain")
                
            # Scrape
            try:
                headers = {"User-Agent": "Mozilla/5.0 ..."}
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    detected_title = soup.title.string[:100] if soup.title else ""
                    # Naive price finding for demo purpose
                    text_blob = soup.get_text().lower()
                    detected_price = self._find_price_in_text(text_blob)
                    confidence += 30 if detected_price > 0 else 0
            except:
                warnings.append("Scraping failed")

        # 2. Image Path
        if image_bytes:
            text = self.extract_text_from_image(image_bytes)
            detected_title = text[:50] + "..."
            detected_price = self._find_price_in_text(text)
            
            if "amazon" in text.lower(): detected_platform = "Amazon"
            elif "flipkart" in text.lower(): detected_platform = "Flipkart"
            
            confidence += 40 if len(text) > 20 else 0
            confidence += 30 if detected_price > 0 else 0
            
        # Final Score Normalization
        confidence = min(confidence, 100.0)
        
        return OfferVerificationResult(
            is_valid=confidence > 40,
            confidence_score=confidence,
            detected_platform=detected_platform,
            detected_title=detected_title,
            detected_price=detected_price,
            warnings=warnings
        )

    def _extract_domain(self, url):
        from urllib.parse import urlparse
        try:
             return urlparse(url).netloc.replace("www.", "").split('.')[0].capitalize()
        except: return "Unknown"
        
    def _find_price_in_text(self, text):
        # Regex to find ₹ 1,200 or Rs. 1200
        matches = re.findall(r'(?:rs\.?|₹)\s*([\d,]+)', text.lower())
        if matches:
            try:
                return float(matches[0].replace(",", ""))
            except: pass
        return 0.0

class ProductMatcher:
    def _extract_critical_tokens(self, text: str) -> set:
        """
        Extracts tokens that are critical for differentiation:
        - Alphanumeric with digits (XM4, 13Pro, 5G)
        - Sizes/Units (1kg, 500ml, 2TB)
        """
        # 1. Spec/Variant codes (Words containing digits)
        # e.g. "XM4", "13", "500"
        tokens = set(re.findall(r'\b[a-zA-Z]*\d+[a-zA-Z%\-]*\b', text.lower()))
        
        # 2. Explicit Unit Patterns (if not caught above, e.g. "1 kg" space separated)
        # We merge "1 kg" into "1kg" for normalization
        units_pattern = r'(\d+(?:\.\d+)?)\s*(kg|g|gm|l|ml|lb|oz|cm|mm|m|tb|gb|mb|KB|hp|kw|v|hz)'
        units = re.findall(units_pattern, text.lower())
        for val, unit in units:
            tokens.add(f"{val}{unit}")
            
        return tokens

    def check_guardrails(self, title1: str, title2: str) -> bool:
        """
        Returns True if SAFE (likely same product), False if MISMATCH detected.
        """
        t1_tokens = self._extract_critical_tokens(title1)
        t2_tokens = self._extract_critical_tokens(title2)
        
        # If no numbers/specs found, rely on semantic only (return True to pass back to threshold)
        if not t1_tokens and not t2_tokens:
            return True
            
        # Intersection over Union or Strict Mismatch?
        # User wants STRICT guardrail for "XM4" vs "XM5" or "1kg" vs "2kg"
        # If there is a symmetric difference in critical tokens, it's likely a variant.
        
        diff = t1_tokens.symmetric_difference(t2_tokens)
        
        if diff:
            # Heuristic: If we have differing numbers, it's a mismatch.
            # Exception: "Pack of 2" vs "Pack of 4" might be same product base, but different offer.
            # For this app (Group Buy), different pack size = different offer. So mismatch is CORRECT.
            logger.info(f"Guardrail Mismatch: {diff} between '{title1}' and '{title2}'")
            return False
            
        return True

    def extract_product_id(self, url: str) -> str:
        """
        Extracts ASIN (Amazon) or FSN (Flipkart) or plain ID from URL.
        """
        try:
            # Amazon ASIN (B0...)
            # Patterns: /dp/B0xxxx, /gp/product/B0xxxx
            asin_match = re.search(r'/(?:dp|gp/product)/(B[A-Z0-9]{9})', url)
            if asin_match:
                return f"AMZN:{asin_match.group(1)}"
            
            # Flipkart FSN (alphanumeric, usually after /p/)
            # .../p/itm[a-zA-Z0-9]+ or just pid=...
            # This is tricky as Flipkart URLs are messy. 
            # Often ?pid=...
            pid_match = re.search(r'[?&]pid=([A-Z0-9]+)', url)
            if pid_match:
                return f"FLIP:{pid_match.group(1)}"
                
        except: pass
        return None

    def find_matches(self, new_offer, active_offers: List[Dict]) -> Dict:
        """
        Checks active_offers for duplicates AND similar items.
        Returns: {
            "duplicate": { "id": str, "reason": str } or None,
            "similar": [ { "id": str, "title": str, "score": float, "reason": str } ]
        }
        """
        new_id = self.extract_product_id(new_offer.product_url) if new_offer.product_url else None
        
        result = {"duplicate": None, "similar": []}
        
        # 1. Product ID Verification (HARD MATCH -> DUPLICATE)
        if new_id:
            for offer in active_offers:
                existing_id = self.extract_product_id(offer.get('product_url', ''))
                if existing_id == new_id:
                     result["duplicate"] = {"id": offer.get('id'), "reason": "Exact Product ID Match"}
                     return result # Return early if exact match found? Or still look for others? Usually strictly sufficient.

        # 2. Semantic Match Loop
        if not new_offer.title: return result
        
        for offer in active_offers:
            existing_title = offer.get('title')
            if not existing_title: continue
            
            similarity = ai_service.calculate_similarity(new_offer.title, existing_title)
            
            # GUARDRAIL CHECK
            is_safe = self.check_guardrails(new_offer.title, existing_title)
            
            # Thresholds
            # A. High Confidence + Safe = DUPLICATE
            if similarity > 0.85 and is_safe:
                if not result["duplicate"]: # Keep the best match or first match
                    result["duplicate"] = {
                        "id": offer.get('id'), 
                        "reason": f"Semantic High Confidence: {similarity:.2f}"
                    }
            
            # B. Medium Confidence OR (High Confidence + Unsafe) = SIMILAR (Did you mean?)
            elif similarity > 0.60:
                reason = f"Similarity: {similarity:.2f}"
                if not is_safe:
                    reason += " (Variant Mismatch)"
                    
                result["similar"].append({
                    "id": offer.get('id'),
                    "title": existing_title,
                    "price": offer.get('price'),
                    "score": similarity,
                    "reason": reason
                })

        # Sort similar by score descending
        result["similar"] = sorted(result["similar"], key=lambda x: x['score'], reverse=True)[:5] # Top 5
        
        return result

ai_service = AIService()
to_matcher = ProductMatcher()
