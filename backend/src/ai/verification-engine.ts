import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import Tesseract from 'tesseract.js';
import * as nlp from 'compromise';
import * as natural from 'natural';
import axios from 'axios';
//import cheerio from 'cheerio';
import sharp from 'sharp';
import { createHash } from 'crypto';

// Types
export interface OfferData {
  sourceUrl?: string;
  screenshot?: Buffer;
  text?: string;
  platform?: string;
}

export interface VerificationResult {
  confidenceScore: number; // 0-100
  isVerified: boolean;
  verificationSteps: VerificationStep[];
  productDetails: ProductDetails;
  warnings: string[];
  needsManualReview: boolean;
}

export interface VerificationStep {
  step: string;
  status: 'passed' | 'failed' | 'warning';
  confidence: number;
  details: string;
}

export interface ProductDetails {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  brand?: string;
  category?: string;
  platform: string;
  productId?: string;
  imageUrl?: string;
  validUntil?: Date;
  stockStatus: string;
}

export class FreeAIVerificationEngine {
  private sentenceEncoder: any;
  private tokenizer: natural.WordTokenizer;
  private classifier: any;
  private whitelistedDomains: Set<string>;
  private priceCache: Map<string, { price: number; timestamp: number }>;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.whitelistedDomains = new Set([
      'amazon.in',
      'flipkart.com',
      'myntra.com',
      'bigbasket.com',
      'blinkit.com',
      'amazon.com',
    ]);
    this.priceCache = new Map();
    this.initModels();
  }

  private async initModels() {
    try {
      // Load Universal Sentence Encoder for text similarity
      this.sentenceEncoder = await use.load();
      console.log('✅ Sentence encoder model loaded');
      
      // Initialize simple classifier for category detection
      this.initCategoryClassifier();
      
      console.log('✅ AI models initialized successfully');
    } catch (error) {
      console.warn('⚠️ Some AI models failed to load, using fallback methods:', error);
    }
  }

  private initCategoryClassifier() {
    // Simple rule-based classifier for college project
    const categories = {
      electronics: ['phone', 'laptop', 'tv', 'camera', 'headphone', 'speaker'],
      fashion: ['shirt', 'pant', 'dress', 'shoe', 'watch', 'bag'],
      grocery: ['rice', 'oil', 'milk', 'egg', 'fruit', 'vegetable'],
      home: ['furniture', 'kitchen', 'decor', 'light', 'bed', 'sofa'],
      books: ['book', 'novel', 'textbook', 'stationery'],
    };
    
    this.classifier = {
      classify: (text: string): string => {
        const lowerText = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            return category;
          }
        }
        return 'other';
      },
    };
  }

  async verifyOffer(offerData: OfferData): Promise<VerificationResult> {
    const steps: VerificationStep[] = [];
    const warnings: string[] = [];
    let overallConfidence = 0;
    let needsManualReview = false;

    try {
      // Step 1: Source Verification
      const sourceResult = await this.verifySource(offerData);
      steps.push(sourceResult.step);
      overallConfidence += sourceResult.confidence * 20; // 20% weight

      if (!sourceResult.step.status === 'passed') {
        warnings.push('Source verification failed or questionable');
        needsManualReview = true;
      }

      // Step 2: Extract Product Information
      const extractionResult = await this.extractProductInfo(offerData);
      steps.push(extractionResult.step);
      overallConfidence += extractionResult.confidence * 30; // 30% weight

      // Step 3: Price Verification
      const priceResult = await this.verifyPrice(extractionResult.details);
      steps.push(priceResult.step);
      overallConfidence += priceResult.confidence * 25; // 25% weight

      if (!priceResult.step.status === 'passed') {
        warnings.push('Price verification questionable');
      }

      // Step 4: Offer Logic Verification
      const logicResult = this.verifyOfferLogic(offerData.text || '');
      steps.push(logicResult.step);
      overallConfidence += logicResult.confidence * 15; // 15% weight

      // Step 5: Seller/Platform Verification
      const sellerResult = this.verifySeller(offerData.platform || '');
      steps.push(sellerResult.step);
      overallConfidence += sellerResult.confidence * 10; // 10% weight

      // Calculate final confidence
      overallConfidence = Math.min(100, Math.max(0, overallConfidence));

      const isVerified = overallConfidence >= 70 && !needsManualReview;

      return {
        confidenceScore: Math.round(overallConfidence),
        isVerified,
        verificationSteps: steps,
        productDetails: extractionResult.details,
        warnings,
        needsManualReview: overallConfidence >= 60 && overallConfidence < 70,
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        confidenceScore: 0,
        isVerified: false,
        verificationSteps: [
          {
            step: 'Error occurred during verification',
            status: 'failed',
            confidence: 0,
            details: error.message,
          },
        ],
        productDetails: {
          title: 'Unknown',
          price: 0,
          platform: offerData.platform || 'Unknown',
          stockStatus: 'unknown',
        },
        warnings: ['Verification process failed'],
        needsManualReview: true,
      };
    }
  }

  private async verifySource(offerData: OfferData): Promise<{
    step: VerificationStep;
    confidence: number;
  }> {
    let confidence = 0;
    let details = '';

    // Check domain if URL is provided
    if (offerData.sourceUrl) {
      try {
        const url = new URL(offerData.sourceUrl);
        const domain = url.hostname.replace('www.', '');
        
        if (this.whitelistedDomains.has(domain)) {
          confidence = 90;
          details = `Domain ${domain} is whitelisted`;
        } else {
          confidence = 30;
          details = `Domain ${domain} is not in whitelist`;
        }
      } catch {
        confidence = 10;
        details = 'Invalid URL format';
      }
    }

    // Check screenshot if provided
    if (offerData.screenshot) {
      try {
        const screenshotAnalysis = await this.analyzeScreenshot(offerData.screenshot);
        confidence = Math.max(confidence, screenshotAnalysis.confidence);
        details += ` | Screenshot analysis: ${screenshotAnalysis.details}`;
      } catch (error) {
        details += ' | Screenshot analysis failed';
      }
    }

    return {
      step: {
        step: 'Source Verification',
        status: confidence >= 70 ? 'passed' : confidence >= 40 ? 'warning' : 'failed',
        confidence,
        details,
      },
      confidence: confidence / 100,
    };
  }

  private async analyzeScreenshot(imageBuffer: Buffer): Promise<{
    confidence: number;
    details: string;
  }> {
    try {
      // Use OCR to extract text
      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m) => console.log('OCR Progress:', m.status),
      });

      const text = result.data.text.toLowerCase();
      
      // Check for known platform indicators
      let confidence = 50; // Base confidence for having text
      let details = 'Text extracted successfully';

      // Check for platform names in text
      const platformIndicators = [
        { name: 'amazon', keywords: ['amazon', 'prime'] },
        { name: 'flipkart', keywords: ['flipkart'] },
        { name: 'myntra', keywords: ['myntra'] },
        { name: 'bigbasket', keywords: ['bigbasket'] },
      ];

      for (const platform of platformIndicators) {
        if (platform.keywords.some(keyword => text.includes(keyword))) {
          confidence += 20;
          details += ` | Detected ${platform.name}`;
        }
      }

      // Check for price patterns
      const priceRegex = /(₹|rs|inr)\s*(\d+([.,]\d+)*)/gi;
      const prices = text.match(priceRegex);
      if (prices && prices.length >= 1) {
        confidence += 15;
        details += ` | Found ${prices.length} price(s)`;
      }

      // Check for product title patterns
      if (text.length > 50 && text.length < 500) {
        confidence += 10;
        details += ' | Reasonable product description';
      }

      return {
        confidence: Math.min(confidence, 100),
        details,
      };
    } catch (error) {
      return {
        confidence: 10,
        details: 'OCR failed: ' + error.message,
      };
    }
  }

  private async extractProductInfo(offerData: OfferData): Promise<{
    step: VerificationStep;
    confidence: number;
    details: ProductDetails;
  }> {
    let confidence = 0;
    let details = '';
    const productDetails: ProductDetails = {
      title: 'Unknown Product',
      price: 0,
      platform: offerData.platform || 'Unknown',
      stockStatus: 'unknown',
    };

    // Method 1: Extract from URL
    if (offerData.sourceUrl) {
      try {
        const urlInfo = await this.extractFromUrl(offerData.sourceUrl);
        Object.assign(productDetails, urlInfo.details);
        confidence = Math.max(confidence, urlInfo.confidence);
        details += 'URL extraction: ' + urlInfo.details;
      } catch (error) {
        details += 'URL extraction failed; ';
      }
    }

    // Method 2: Extract from text
    if (offerData.text) {
      try {
        const textInfo = this.extractFromText(offerData.text);
        if (textInfo.confidence > confidence) {
          Object.assign(productDetails, textInfo.details);
          confidence = textInfo.confidence;
        }
        details += 'Text extraction: ' + textInfo.details;
      } catch (error) {
        details += 'Text extraction failed; ';
      }
    }

    // Method 3: Extract from screenshot
    if (offerData.screenshot) {
      try {
        const screenshotInfo = await this.extractFromScreenshot(offerData.screenshot);
        if (screenshotInfo.confidence > confidence) {
          Object.assign(productDetails, screenshotInfo.details);
          confidence = screenshotInfo.confidence;
        }
        details += 'Screenshot extraction: ' + screenshotInfo.details;
      } catch (error) {
        details += 'Screenshot extraction failed; ';
      }
    }

    // Use NLP to improve title
    if (productDetails.title === 'Unknown Product' && offerData.text) {
      productDetails.title = this.extractTitleFromText(offerData.text);
      confidence = Math.max(confidence, 40);
      details += 'Used NLP for title extraction; ';
    }

    // Categorize product
    if (productDetails.title !== 'Unknown Product') {
      productDetails.category = this.classify?.classify(productDetails.title) || 'other';
      details += `Category: ${productDetails.category}; `;
    }

    return {
      step: {
        step: 'Product Information Extraction',
        status: confidence >= 60 ? 'passed' : confidence >= 30 ? 'warning' : 'failed',
        confidence,
        details,
      },
      confidence: confidence / 100,
      details: productDetails,
    };
  }

  private async extractFromUrl(url: string): Promise<{
    confidence: number;
    details: Partial<ProductDetails>;
  }> {
    try {
      // Parse URL for product ID
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Common patterns for product IDs
      let productId = '';
      for (const part of pathParts) {
        if (part.length > 5 && /^[A-Z0-9]+$/i.test(part)) {
          productId = part;
          break;
        }
      }

      // Try to fetch and parse the page
      let title = '';
      let price = 0;
      
      if (urlObj.hostname.includes('amazon')) {
        // Amazon specific parsing
        const matches = url.match(/\/dp\/([A-Z0-9]+)/i);
        if (matches) productId = matches[1];
        title = this.extractAmazonInfo(url);
      } else if (urlObj.hostname.includes('flipkart')) {
        // Flipkart specific parsing
        const matches = url.match(/\/(p\/[a-z0-9]+)/i);
        if (matches) productId = matches[1];
        title = this.extractFlipkartInfo(url);
      }

      return {
        confidence: productId ? 70 : 40,
        details: {
          productId,
          title: title || 'Product from URL',
          platform: urlObj.hostname.replace('www.', ''),
        },
      };
    } catch (error) {
      return {
        confidence: 20,
        details: {},
      };
    }
  }

  private extractFromText(text: string): {
    confidence: number;
    details: Partial<ProductDetails>;
  } {
    const doc = nlp(text);
    
    // Extract price
    const prices = doc.values().toNumber().out('array');
    const numericPrices = prices
      .map(p => parseFloat(p.toString().replace(/[^0-9.]/g, '')))
      .filter(p => !isNaN(p) && p > 0);
    
    const price = numericPrices.length > 0 ? Math.max(...numericPrices) : 0;
    
    // Extract title (first 5-7 words that aren't prices or common words)
    const words = text.split(/\s+/);
    const commonWords = new Set(['buy', 'price', 'offer', 'discount', 'sale', 'rs', '₹']);
    const titleWords = words
      .filter(word => word.length > 3 && !commonWords.has(word.toLowerCase()))
      .slice(0, 7)
      .join(' ');
    
    // Detect brand
    const knownBrands = ['samsung', 'apple', 'nike', 'adidas', 'puma', 'mi', 'oneplus'];
    let brand = '';
    for (const knownBrand of knownBrands) {
      if (text.toLowerCase().includes(knownBrand)) {
        brand = knownBrand;
        break;
      }
    }

    return {
      confidence: price > 0 ? 60 : 30,
      details: {
        title: titleWords || 'Product from text',
        price,
        brand: brand || undefined,
      },
    };
  }

  private async extractFromScreenshot(imageBuffer: Buffer): Promise<{
    confidence: number;
    details: Partial<ProductDetails>;
  }> {
    try {
      // Use OCR
      const result = await Tesseract.recognize(imageBuffer, 'eng');
      const text = result.data.text;
      
      return {
        confidence: text.length > 20 ? 50 : 20,
        details: this.extractFromText(text).details,
      };
    } catch (error) {
      return {
        confidence: 10,
        details: {},
      };
    }
  }

  private extractTitleFromText(text: string): string {
    // Simple heuristic: take first sentence or first meaningful phrase
    const sentences = text.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length > 10 && firstSentence.length < 100) {
      return firstSentence;
    }
    
    // Fallback: take first 5 meaningful words
    const words = text.split(/\s+/).filter(word => word.length > 3);
    return words.slice(0, 5).join(' ') || 'Unknown Product';
  }

  private async verifyPrice(productDetails: ProductDetails): Promise<{
    step: VerificationStep;
    confidence: number;
  }> {
    const price = productDetails.price;
    let confidence = 0;
    let details = '';

    // Basic price validation
    if (price <= 0) {
      confidence = 0;
      details = 'Invalid price (zero or negative)';
    } else if (price > 1000000) {
      confidence = 30;
      details = 'Price seems unusually high';
    } else if (price < 50) {
      confidence = 40;
      details = 'Price seems unusually low';
    } else {
      confidence = 70;
      details = 'Price appears reasonable';
      
      // Try to compare with historical/cached prices
      const cacheKey = createHash('md5')
        .update(productDetails.title + productDetails.platform)
        .digest('hex');
      
      const cached = this.priceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        const priceDiff = Math.abs(price - cached.price) / cached.price * 100;
        if (priceDiff < 30) {
          confidence += 20;
          details += ` | Consistent with previous price (${priceDiff.toFixed(1)}% difference)`;
        } else {
          confidence -= 10;
          details += ` | Significant price change (${priceDiff.toFixed(1)}% difference)`;
        }
      }
      
      // Cache this price
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
    }

    return {
      step: {
        step: 'Price Verification',
        status: confidence >= 60 ? 'passed' : confidence >= 30 ? 'warning' : 'failed',
        confidence,
        details,
      },
      confidence: confidence / 100,
    };
  }

  private verifyOfferLogic(text: string): {
    step: VerificationStep;
    confidence: number;
  } {
    const lowerText = text.toLowerCase();
    let confidence = 50;
    let details = 'Basic offer logic check';

    // Check for common offer patterns
    const patterns = [
      { regex: /buy\s+\d+\s+get\s+\d+\s+free/i, weight: +20, desc: 'Buy X Get Y free' },
      { regex: /discount\s+of\s+\d+%/i, weight: +15, desc: 'Percentage discount' },
      { regex: /flat\s+\d+\s*off/i, weight: +15, desc: 'Flat discount' },
      { regex: /combo\s+offer/i, weight: +10, desc: 'Combo offer' },
      { regex: /flash\s+sale/i, weight: +10, desc: 'Flash sale' },
      { regex: /limited\s+time/i, weight: +5, desc: 'Limited time offer' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(lowerText)) {
        confidence += pattern.weight;
        details += ` | ${pattern.desc}`;
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { regex: /100%\s+free/i, weight: -30, desc: '100% free (suspicious)' },
      { regex: /no\s+catch/i, weight: -20, desc: '"No catch" phrase' },
      { regex: /unbelievable\s+price/i, weight: -15, desc: 'Overly promotional' },
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.regex.test(lowerText)) {
        confidence += pattern.weight;
        details += ` | ${pattern.desc}`;
      }
    }

    confidence = Math.max(0, Math.min(100, confidence));

    return {
      step: {
        step: 'Offer Logic Verification',
        status: confidence >= 50 ? 'passed' : confidence >= 30 ? 'warning' : 'failed',
        confidence,
        details,
      },
      confidence: confidence / 100,
    };
  }

  private verifySeller(platform: string): {
    step: VerificationStep;
    confidence: number;
  } {
    const trustedPlatforms = ['amazon.in', 'flipkart.com', 'myntra.com'];
    const moderatePlatforms = ['bigbasket.com', 'blinkit.com'];
    
    let confidence = 0;
    let details = '';

    if (trustedPlatforms.includes(platform)) {
      confidence = 90;
      details = `${platform} is a trusted platform`;
    } else if (moderatePlatforms.includes(platform)) {
      confidence = 70;
      details = `${platform} is a moderately trusted platform`;
    } else if (platform) {
      confidence = 40;
      details = `${platform} is not in our trusted list`;
    } else {
      confidence = 20;
      details = 'No platform specified';
    }

    return {
      step: {
        step: 'Seller/Platform Verification',
        status: confidence >= 60 ? 'passed' : confidence >= 40 ? 'warning' : 'failed',
        confidence,
        details,
      },
      confidence: confidence / 100,
    };
  }

  // Helper methods for specific platforms
  private extractAmazonInfo(url: string): string {
    // Extract product name from Amazon URL
    const matches = url.match(/\/dp\/[A-Z0-9]+\/([^/?]+)/i);
    if (matches) {
      return decodeURIComponent(matches[1].replace(/-/g, ' '));
    }
    return '';
  }

  private extractFlipkartInfo(url: string): string {
    // Extract product name from Flipkart URL
    const matches = url.match(/\/p\/[a-z0-9]+\/([^/?]+)/i);
    if (matches) {
      return decodeURIComponent(matches[1].replace(/-/g, ' '));
    }
    return '';
  }
}

// Export singleton instance
export const aiVerificationEngine = new FreeAIVerificationEngine();