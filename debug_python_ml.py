#!/usr/bin/env python3
"""
Debug the Python ML service directly
"""

import sys
import os
import json
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_python_ml_service():
    """Test the Python ML service components individually"""
    
    print("🐍 Testing Python ML Service Components")
    print("=" * 60)
    
    # Test 1: Import models
    try:
        print("1️⃣ Testing model imports...")
        import models
        print("   ✅ Models imported successfully")
        
        League = models.League
        Game = models.Game
        MLRequest = models.MLRequest
        print(f"   ✅ Key classes available: {[League.__name__, Game.__name__, MLRequest.__name__]}")
        
    except Exception as e:
        print(f"   ❌ Model import failed: {str(e)}")
        return False
    
    # Test 2: Import external APIs
    try:
        print("\n2️⃣ Testing external API imports...")
        import external_apis
        SportsDataAPI = external_apis.SportsDataAPI
        print("   ✅ External APIs imported successfully")
        
        # Test API initialization
        api = SportsDataAPI()
        print(f"   ✅ SportsDataAPI initialized (has key: {bool(api.api_key)})")
        
    except Exception as e:
        print(f"   ❌ External API import failed: {str(e)}")
        return False
    
    # Test 3: Import prediction engine
    try:
        print("\n3️⃣ Testing prediction engine imports...")
        import prediction_engine
        MLPredictionEngine = prediction_engine.MLPredictionEngine
        print("   ✅ Prediction engine imported successfully")
        
        # Test engine initialization
        engine = MLPredictionEngine()
        print("   ✅ ML engine initialized successfully")
        
    except Exception as e:
        print(f"   ❌ Prediction engine import failed: {str(e)}")
        print(f"   Error details: {repr(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 4: Create a simple ML request
    try:
        print("\n4️⃣ Testing ML request creation...")
        
        # Create test game
        game = Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=League.NFL,
            start_time=datetime.now().isoformat(),
            odds={
                "home_ml": -120,
                "away_ml": 100
            }
        )
        print("   ✅ Test game created")
        
        # Create ML request
        ml_request = MLRequest(
            date=datetime.now().date(),
            games=[game],
            min_confidence=60.0
        )
        print("   ✅ ML request created")
        
    except Exception as e:
        print(f"   ❌ ML request creation failed: {str(e)}")
        return False
    
    # Test 5: Generate prediction
    try:
        print("\n5️⃣ Testing ML prediction generation...")
        
        response = engine.generate_pick(ml_request)
        print("   ✅ ML prediction generated successfully!")
        print(f"   📊 Selection: {response.selection}")
        print(f"   📊 Confidence: {response.confidence}%")
        print(f"   📊 Model Version: {response.model_version}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ ML prediction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_python_ml_service()
    
    print("\n" + "=" * 60)
    if success:
        print("🎯 Python ML service is working correctly!")
        print("The issue might be in the Node.js → Python communication.")
    else:
        print("⚠️  Python ML service has issues that need to be fixed.")
        print("This is why the fallback model is being used.")