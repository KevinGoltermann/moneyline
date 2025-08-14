"""
ML Pick Generation API Endpoint

This serverless function handles ML-powered betting pick generation.
It processes game data, applies feature engineering, and returns the highest
expected value betting recommendation using XGBoost and fallback models.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from .models import MLRequest, MLResponse, Game
from .prediction_engine import MLPredictionEngine


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler for ML pick generation."""
    
    def __init__(self, *args, **kwargs):
        """Initialize handler with ML prediction engine."""
        self.prediction_engine = None
        super().__init__(*args, **kwargs)
    
    def do_POST(self):
        """Handle POST requests for ML pick generation."""
        try:
            logger.info("Received ML pick generation request")
            
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Validate request data
            ml_request = MLRequest(**request_data)
            logger.info(f"Processing request for {len(ml_request.games)} games on {ml_request.date}")
            
            # Initialize prediction engine if needed
            if not self.prediction_engine:
                self.prediction_engine = MLPredictionEngine()
            
            # Generate ML prediction
            response = self.prediction_engine.generate_pick(ml_request)
            
            # Return successful response
            self._send_response(200, response.dict())
            logger.info(f"Successfully generated pick: {response.selection}")
            
        except ValueError as e:
            logger.error(f"Validation error: {str(e)}")
            self._send_error(400, f"Invalid request data: {str(e)}")
        except Exception as e:
            logger.error(f"Internal error: {str(e)}")
            self._send_error(500, f"Internal server error: {str(e)}")
    
    def do_GET(self):
        """Handle GET requests for health check."""
        try:
            health_status = {
                "status": "healthy",
                "service": "ML Pick Generation",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            }
            
            # Check if prediction engine can be initialized
            try:
                if not self.prediction_engine:
                    self.prediction_engine = MLPredictionEngine()
                health_status["ml_engine"] = "ready"
            except Exception as e:
                health_status["ml_engine"] = f"error: {str(e)}"
                health_status["status"] = "degraded"
            
            status_code = 200 if health_status["status"] == "healthy" else 503
            self._send_response(status_code, health_status)
            
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            self._send_error(500, f"Health check failed: {str(e)}")
    
    def _send_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response_json = json.dumps(data, default=str)
        self.wfile.write(response_json.encode('utf-8'))
    
    def _send_error(self, status_code: int, message: str):
        """Send error response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        error_response = {
            "error": message, 
            "code": status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()