#!/usr/bin/env python3
"""
Test the fixed original models
"""

import sys
import os
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_fixed_models():
    """Test the fixed original models"""
    
    print("🔧 Testing Fixed Original Models")
    print("=" * 50)
    
    try:
        # Import original models
        import models
        print("✅ Original models imported successfully")
        
        # Test basic classes
        League = models.League
        Game = models.Game
        MLRequest = models.MLRequest
        MLResponse = models.MLResponse
        FeatureVector = models.FeatureVector
        
        print("✅ All key classes available")
        
        # Create test game
        game = Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=League.NFL,
            start_time=datetime.now(),
            odds={"home_ml": -120, "away_ml": 100}
        )
        print("✅ Test game created successfully")
        
        # Create ML request
        ml_request = MLRequest(
            date=datetime.now().date(),
            games=[game]
        )
        print("✅ ML request created successfully")
        
        # Create feature vector
        feature_vector = FeatureVector(
            odds_value=-120,
            home_win_rate=0.75,
            away_win_rate=0.65,
            recent_form_home=0.8,
            recent_form_away=0.6,
            home_offensive_rating=110.0,
            away_offensive_rating=105.0,
            home_defensive_rating=95.0,
            away_defensive_rating=100.0
        )
        print("✅ Feature vector created successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_fixed_models()
    
    print("\n" + "=" * 50)
    if success:
        print("🎯 Fixed original models work! Now we can test the complex ML system.")
    else:
        print("⚠️  Still having issues - need to investigate further.")