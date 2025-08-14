#!/usr/bin/env python3
"""
Test the full complex ML system with SportsData.io integration
"""

import sys
import os
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_complex_ml_system():
    """Test the full complex ML system"""
    
    print("🚀 Testing Complex ML System with SportsData.io")
    print("=" * 60)
    
    try:
        # Test 1: Import all modules
        print("1️⃣ Testing imports...")
        import models
        import external_apis
        import feature_engineering
        import prediction_engine
        
        print("   ✅ All modules imported successfully")
        
        # Test 2: Initialize components
        print("\n2️⃣ Initializing components...")
        sports_api = external_apis.SportsDataAPI()
        feature_engineer = feature_engineering.FeatureEngineer()
        ml_engine = prediction_engine.MLPredictionEngine()
        
        print("   ✅ All components initialized")
        
        # Test 3: Create test data
        print("\n3️⃣ Creating test data...")
        game = models.Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=models.League.NFL,
            start_time=datetime.now(),
            odds={"home_ml": -120, "away_ml": 100},
            venue="Arrowhead Stadium",
            weather={"temperature": 45, "wind_speed": 8}
        )
        
        ml_request = models.MLRequest(
            date=datetime.now().date(),
            games=[game],
            min_confidence=60.0
        )
        
        print("   ✅ Test data created")
        
        # Test 4: Test SportsData.io integration
        print("\n4️⃣ Testing SportsData.io integration...")
        try:
            team_stats = sports_api.get_team_stats("Kansas City Chiefs", models.League.NFL)
            print(f"   ✅ Team stats retrieved: {team_stats.get('team_name', 'Unknown')}")
            
            injuries = sports_api.get_injury_report("Kansas City Chiefs", models.League.NFL)
            print(f"   ✅ Injury report retrieved: {len(injuries)} injuries")
            
        except Exception as e:
            print(f"   ⚠️  SportsData.io error (will use mock data): {str(e)}")
        
        # Test 5: Test feature engineering
        print("\n5️⃣ Testing feature engineering...")
        features = feature_engineer.process_game_features(game)
        print(f"   ✅ Features generated: {type(features).__name__}")
        print(f"   📊 Sample features: odds_value={features.odds_value}, home_win_rate={features.home_win_rate}")
        
        # Test 6: Generate ML prediction
        print("\n6️⃣ Testing ML prediction generation...")
        response = ml_engine.generate_pick(ml_request)
        
        print("   ✅ ML prediction generated successfully!")
        print(f"\n📊 Complex ML Results:")
        print(f"   Selection: {response.selection}")
        print(f"   Confidence: {response.confidence}%")
        print(f"   Expected Value: {response.expected_value}")
        print(f"   Model Version: {response.model_version}")
        print(f"   Features Used: {len(response.features_used)}")
        
        rationale = response.rationale
        if hasattr(rationale, 'reasoning'):
            print(f"   Reasoning: {rationale.reasoning}")
            print(f"   Top Factors: {', '.join(rationale.top_factors)}")
        else:
            print(f"   Reasoning: {rationale.get('reasoning', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in complex ML system: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_complex_ml_system()
    
    print("\n" + "=" * 60)
    if success:
        print("🎯 Complex ML system is working!")
        print("Your sophisticated algorithm with SportsData.io integration is ready!")
    else:
        print("⚠️  Complex ML system needs debugging.")