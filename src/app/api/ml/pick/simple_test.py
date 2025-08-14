#!/usr/bin/env python3
"""
Simple test to verify ML prediction engine functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, date
import json

def test_basic_functionality():
    """Test basic ML prediction engine functionality."""
    print("Testing ML Prediction Engine...")
    print("=" * 50)
    
    try:
        # Import the prediction engine
        from prediction_engine import MLPredictionEngine
        print("✓ Successfully imported MLPredictionEngine")
        
        # Initialize the engine
        engine = MLPredictionEngine()
        print("✓ Successfully initialized prediction engine")
        
        # Test feature conversion
        import numpy as np
        from models import FeatureVector
        
        features = FeatureVector(
            odds_value=-120,
            home_win_rate=0.7,
            away_win_rate=0.5,
            recent_form_home=0.8,
            recent_form_away=0.4
        )
        
        feature_array = engine._features_to_array(features, "home")
        print(f"✓ Feature conversion successful: {len(feature_array)} features")
        
        # Test expected value calculation
        ev = engine._calculate_expected_value(0.6, -110)
        print(f"✓ Expected value calculation: {ev:.3f}")
        
        # Test heuristic prediction
        win_prob, confidence, importance = engine._heuristic_prediction(feature_array)
        print(f"✓ Heuristic prediction: {win_prob:.3f} win prob, {confidence:.1f}% confidence")
        
        # Test odds range validation
        from models import MLRequest
        request = MLRequest(
            date=date(2024, 1, 15),
            games=[],
            min_odds=-200,
            max_odds=300
        )
        
        in_range = engine._odds_in_range(-150, request)
        print(f"✓ Odds range validation: {in_range}")
        
        # Test feature name humanization
        human_name = engine._humanize_feature_name("odds_value")
        print(f"✓ Feature humanization: '{human_name}'")
        
        print("\n" + "=" * 50)
        print("✓ All basic functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_mock_game_analysis():
    """Test with mock game data."""
    print("\nTesting Mock Game Analysis...")
    print("=" * 50)
    
    try:
        from prediction_engine import MLPredictionEngine
        from models import Game, MLRequest, League
        
        # Create mock game
        game = Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=League.NFL,
            start_time=datetime(2024, 1, 15, 20, 0),
            odds={
                "home_ml": -120,
                "away_ml": +100
            }
        )
        
        request = MLRequest(
            date=date(2024, 1, 15),
            games=[game],
            min_confidence=50.0
        )
        
        engine = MLPredictionEngine()
        
        # Test game enhancement
        enhanced_game = engine._enhance_game_data(game)
        print(f"✓ Game enhancement successful: {enhanced_game.home_team} vs {enhanced_game.away_team}")
        
        # Test feature processing
        from feature_engineering import FeatureEngineer
        feature_engineer = FeatureEngineer()
        features = feature_engineer.process_game_features(enhanced_game)
        print(f"✓ Feature processing successful: odds_value={features.odds_value}")
        
        # Test pick option analysis
        candidate = engine._analyze_pick_option(enhanced_game, "home", features, request)
        if candidate:
            print(f"✓ Pick analysis successful: {candidate.selection}")
        else:
            print("✓ Pick analysis returned None (expected for low confidence)")
        
        print("\n" + "=" * 50)
        print("✓ Mock game analysis tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Mock game test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_full_pipeline():
    """Test the complete ML pipeline."""
    print("\nTesting Full ML Pipeline...")
    print("=" * 50)
    
    try:
        from prediction_engine import MLPredictionEngine
        from models import Game, MLRequest, League
        
        # Create multiple games
        games = [
            Game(
                home_team="Kansas City Chiefs",
                away_team="Buffalo Bills",
                league=League.NFL,
                start_time=datetime(2024, 1, 15, 20, 0),
                odds={
                    "home_ml": -115,
                    "away_ml": -105
                }
            ),
            Game(
                home_team="Green Bay Packers",
                away_team="Chicago Bears",
                league=League.NFL,
                start_time=datetime(2024, 1, 15, 16, 0),
                odds={
                    "home_ml": -140,
                    "away_ml": +120
                }
            )
        ]
        
        request = MLRequest(
            date=date(2024, 1, 15),
            games=games,
            min_confidence=40.0  # Lower threshold for testing
        )
        
        engine = MLPredictionEngine()
        
        # Generate pick
        response = engine.generate_pick(request)
        
        print(f"✓ Full pipeline successful!")
        print(f"  Selection: {response.selection}")
        print(f"  Confidence: {response.confidence}%")
        print(f"  Expected Value: {response.expected_value:.3f}")
        print(f"  Model Version: {response.model_version}")
        
        # Validate response structure
        assert response.selection is not None
        assert 0 <= response.confidence <= 100
        assert isinstance(response.rationale, dict)
        assert isinstance(response.features_used, list)
        
        print("\n" + "=" * 50)
        print("✓ Full pipeline tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Full pipeline test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = True
    
    success &= test_basic_functionality()
    success &= test_mock_game_analysis()
    success &= test_full_pipeline()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL TESTS PASSED! ML Prediction Engine is working correctly.")
    else:
        print("❌ Some tests failed. Check the output above for details.")
    
    sys.exit(0 if success else 1)