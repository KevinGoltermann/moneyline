#!/usr/bin/env python3
"""
Test the simplified prediction engine
"""

import sys
import os
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_simple_engine():
    """Test the simplified prediction engine"""
    
    print("🤖 Testing Simplified ML Engine")
    print("=" * 50)
    
    try:
        # Import modules
        import models_simple as models
        from prediction_engine_simple import SimplePredictionEngine
        
        print("✅ Modules imported successfully")
        
        # Create test game
        game = models.Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=models.League.NFL,
            start_time=datetime.now().isoformat(),
            odds={"home_ml": -120, "away_ml": 100}
        )
        print("✅ Test game created")
        
        # Create ML request
        ml_request = models.MLRequest(
            date=datetime.now().date().isoformat(),
            games=[game],
            min_confidence=60.0
        )
        print("✅ ML request created")
        
        # Initialize engine
        engine = SimplePredictionEngine()
        print("✅ ML engine initialized")
        
        # Generate prediction
        response = engine.generate_pick(ml_request)
        print("✅ ML prediction generated!")
        
        # Display results
        print(f"\n📊 Results:")
        print(f"   Selection: {response.selection}")
        print(f"   Confidence: {response.confidence}%")
        print(f"   Expected Value: {response.expected_value}")
        print(f"   Model Version: {response.model_version}")
        print(f"   Features Used: {len(response.features_used)}")
        
        rationale = response.rationale
        print(f"   Reasoning: {rationale.get('reasoning', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_engine()
    
    print("\n" + "=" * 50)
    if success:
        print("🎯 Simplified ML engine works!")
        print("We can now integrate this with the API endpoint.")
    else:
        print("⚠️  Still having issues - need to debug further.")