#!/usr/bin/env python3
"""
Test the simplified models to avoid recursion issues
"""

import sys
import os
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_simple_models():
    """Test the simplified models"""
    
    print("🧪 Testing Simplified Models")
    print("=" * 40)
    
    try:
        # Import simplified models
        import models_simple as models
        print("✅ Simplified models imported successfully")
        
        # Test basic classes
        League = models.League
        Game = models.Game
        MLRequest = models.MLRequest
        MLResponse = models.MLResponse
        
        print("✅ Key classes available")
        
        # Create test game
        game = Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=League.NFL,
            start_time=datetime.now().isoformat(),
            odds={"home_ml": -120, "away_ml": 100}
        )
        print("✅ Test game created successfully")
        
        # Create ML request
        ml_request = MLRequest(
            date=datetime.now().date().isoformat(),
            games=[game]
        )
        print("✅ ML request created successfully")
        
        # Create ML response
        ml_response = MLResponse(
            selection="Kansas City Chiefs ML",
            market=models.MarketType.MONEYLINE,
            league=League.NFL,
            odds=-120,
            confidence=75.0,
            rationale={"reasoning": "Test reasoning"},
            features_used=["odds_value"],
            generated_at=datetime.now().isoformat()
        )
        print("✅ ML response created successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_models()
    
    print("\n" + "=" * 40)
    if success:
        print("🎯 Simplified models work! We can use these to fix the ML service.")
    else:
        print("⚠️  Still having issues - need to investigate further.")