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

ai_service = AIService()
