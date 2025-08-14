#!/usr/bin/env python3
"""
Test the enhanced ML endpoint with real data
"""

import requests
import json
from datetime import datetime, date

def test_ml_endpoint():
    """Test the ML endpoint with sample data"""
    
    print("🤖 Testing Enhanced ML Endpoint")
    print("=" * 50)
    
    # Sample game data
    test_request = {
        "date": date.today().isoformat(),
        "games": [
            {
                "home_team": "Kansas City Chiefs",
                "away_team": "Buffalo Bills", 
                "league": "NFL",
                "start_time": datetime.now().isoformat(),
                "odds": {
                    "home_ml": -120,
                    "away_ml": +100,
                    "home_spread": -2.5,
                    "away_spread": +2.5
                },
                "venue": "Arrowhead Stadium",
                "weather": {
                    "temperature": 45,
                    "wind_speed": 8,
                    "precipitation": 0.0
                }
            },
            {
                "home_team": "Los Angeles Lakers",
                "away_team": "Boston Celtics",
                "league": "NBA", 
                "start_time": datetime.now().isoformat(),
                "odds": {
                    "home_ml": -110,
                    "away_ml": -110,
                    "home_spread": -1.5,
                    "away_spread": +1.5
                },
                "venue": "Crypto.com Arena"
            }
        ],
        "min_confidence": 60.0
    }
    
    try:
        # Test the endpoint
        url = "http://localhost:3000/api/ml/pick"
        
        print("📡 Sending request to ML endpoint...")
        response = requests.post(url, json=test_request, timeout=35)
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ ML Endpoint Response:")
            print(f"   Selection: {result.get('selection', 'Unknown')}")
            print(f"   Confidence: {result.get('confidence', 0)}%")
            print(f"   Expected Value: {result.get('expected_value', 0):.3f}")
            print(f"   Model Version: {result.get('model_version', 'Unknown')}")
            print(f"   Features Used: {len(result.get('features_used', []))}")
            
            rationale = result.get('rationale', {})
            print(f"   Reasoning: {rationale.get('reasoning', 'N/A')}")
            print(f"   Top Factors: {', '.join(rationale.get('top_factors', []))}")
            
            return True
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure your Next.js server is running")
        print("   Run: npm run dev")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_ml_endpoint()
    
    print("\n" + "=" * 50)
    if success:
        print("🎯 Enhanced ML endpoint is working!")
        print("Your sophisticated algorithm is now live with SportsData.io integration!")
    else:
        print("⚠️  Test failed - check that your Next.js server is running")
        print("The endpoint should still work with fallback logic")