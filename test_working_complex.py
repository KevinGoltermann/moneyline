#!/usr/bin/env python3
"""
Test the working complex ML system
"""

import sys
import os
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

def test_working_complex_system():
    """Test the working complex ML system"""
    
    print("🚀 Testing Working Complex ML System")
    print("=" * 60)
    
    try:
        # Import working modules
        import models_simple as models
        from prediction_engine_simple import ComplexPredictionEngine
        
        print("✅ Working modules imported successfully")
        
        # Create test data
        game = models.Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=models.League.NFL,
            start_time=datetime.now().isoformat(),
            odds={"home_ml": -120, "away_ml": 100},
            venue="Arrowhead Stadium",
            weather={"temperature": 45, "wind_speed": 8, "precipitation": 0.0}
        )
        
        ml_request = models.MLRequest(
            date=datetime.now().date().isoformat(),
            games=[game],
            min_confidence=60.0
        )
        
        print("✅ Test data created")
        
        # Initialize complex engine
        engine = ComplexPredictionEngine()
        print("✅ Complex ML engine initialized")
        
        # Generate complex prediction
        print("\n🔍 Generating complex ML prediction...")
        response = engine.generate_pick(ml_request)
        
        print("\n🎯 Complex ML Results:")
        print(f"   Selection: {response.selection}")
        print(f"   Confidence: {response.confidence}%")
        print(f"   Expected Value: {response.expected_value:.4f}")
        print(f"   Model Version: {response.model_version}")
        print(f"   Features Used: {len(response.features_used)}")
        
        rationale = response.rationale
        print(f"\n📊 Analysis Details:")
        print(f"   Reasoning: {rationale.get('reasoning', 'N/A')}")
        print(f"   Top Factors: {', '.join(rationale.get('top_factors', []))}")
        print(f"   Risk Assessment: {rationale.get('risk_assessment', 'N/A')}")
        
        key_insights = rationale.get('key_insights', [])
        if key_insights:
            print(f"   Key Insights: {', '.join(key_insights)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_working_complex_system()
    
    print("\n" + "=" * 60)
    if success:
        print("🎯 Working Complex ML System is operational!")
        print("Ready to integrate with the API endpoint!")
    else:
        print("⚠️  Still debugging the complex system.")