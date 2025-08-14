"""
Test suite for ML Prediction Engine

This module contains comprehensive tests for the ML prediction engine,
including unit tests for individual components and integration tests
for the complete pipeline.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from datetime import datetime, date
from typing import Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import (
    Game, MLRequest, League, MarketType, FeatureVector, 
    ModelPrediction, PickCandidate
)
from prediction_engine import MLPredictionEngine
from feature_engineering import FeatureEngineer


class TestMLPredictionEngine(unittest.TestCase):
    """Test cases for ML Prediction Engine."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.engine = MLPredictionEngine()
        
        # Create sample game data
        self.sample_game = Game(
            home_team="Kansas City Chiefs",
            away_team="Buffalo Bills",
            league=League.NFL,
            start_time=datetime(2024, 1, 15, 20, 0),
            odds={
                "home_ml": -120,
                "away_ml": +100,
                "home_spread": -2.5,
                "away_spread": +2.5
            },
            venue="Arrowhead Stadium",
            weather={
                "temperature": 45,
                "wind_speed": 8,
                "precipitation": 0.0
            }
        )
        
        # Create sample ML request
        self.sample_request = MLRequest(
            date=date(2024, 1, 15),
            games=[self.sample_game],
            min_confidence=60.0,
            min_odds=-200,
            max_odds=300
        )
    
    def test_generate_pick_success(self):
        """Test successful pick generation."""
        try:
            response = self.engine.generate_pick(self.sample_request)
            
            # Verify response structure
            self.assertIsNotNone(response.selection)
            self.assertIsInstance(response.confidence, float)
            self.assertGreaterEqual(response.confidence, 0.0)
            self.assertLessEqual(response.confidence, 100.0)
            self.assertIsInstance(response.odds, (int, float))
            self.assertIsInstance(response.rationale, dict)
            self.assertIsInstance(response.features_used, list)
            
            print(f"✓ Generated pick: {response.selection} with {response.confidence}% confidence")
            
        except Exception as e:
            self.fail(f"Pick generation failed: {str(e)}")
    
    def test_generate_pick_no_games(self):
        """Test pick generation with no games."""
        empty_request = MLRequest(
            date=date(2024, 1, 15),
            games=[]
        )
        
        with self.assertRaises(Exception):
            self.engine.generate_pick(empty_request)
    
    def test_features_to_array(self):
        """Test feature vector to array conversion."""
        features = FeatureVector(
            odds_value=-120,
            home_win_rate=0.7,
            away_win_rate=0.6,
            recent_form_home=0.8,
            recent_form_away=0.5
        )
        
        array = self.engine._features_to_array(features, "home")
        
        self.assertIsInstance(array, np.ndarray)
        self.assertEqual(len(array), 16)  # Expected number of features
        self.assertEqual(array[-1], 1.0)  # Home indicator should be 1.0
        
        array_away = self.engine._features_to_array(features, "away")
        self.assertEqual(array_away[-1], 0.0)  # Away indicator should be 0.0
    
    def test_calculate_expected_value(self):
        """Test expected value calculation."""
        # Test positive odds
        ev_positive = self.engine._calculate_expected_value(0.6, 150)
        self.assertGreater(ev_positive, 0)  # Should be positive EV
        
        # Test negative odds
        ev_negative = self.engine._calculate_expected_value(0.4, -150)
        self.assertLess(ev_negative, 0)  # Should be negative EV
        
        # Test break-even scenario
        ev_breakeven = self.engine._calculate_expected_value(0.52, -110)
        self.assertAlmostEqual(ev_breakeven, 0, places=2)
    
    def test_odds_in_range(self):
        """Test odds range validation."""
        # Test odds within range
        self.assertTrue(self.engine._odds_in_range(-150, self.sample_request))
        self.assertTrue(self.engine._odds_in_range(200, self.sample_request))
        
        # Test odds outside range
        self.assertFalse(self.engine._odds_in_range(-250, self.sample_request))
        self.assertFalse(self.engine._odds_in_range(400, self.sample_request))
    
    def test_heuristic_prediction(self):
        """Test heuristic prediction fallback."""
        features = np.array([
            -120,  # odds_value
            0.0,   # odds_movement
            1.0,   # market_efficiency
            0.7,   # home_win_rate
            0.5,   # away_win_rate
            0.5,   # head_to_head
            0.8,   # recent_form_home
            0.4,   # recent_form_away
            3,     # rest_days_home
            3,     # rest_days_away
            0.0,   # travel_distance
            0.0,   # weather_impact
            0.5,   # strength_of_schedule
            0.0,   # injury_impact
            0.0,   # motivation_factor
            1.0    # home_indicator
        ])
        
        win_prob, confidence, importance = self.engine._heuristic_prediction(features)
        
        self.assertGreaterEqual(win_prob, 0.1)
        self.assertLessEqual(win_prob, 0.9)
        self.assertGreaterEqual(confidence, 0.0)
        self.assertLessEqual(confidence, 100.0)
        self.assertIsInstance(importance, dict)
    
    def test_humanize_feature_name(self):
        """Test feature name humanization."""
        test_cases = {
            "odds_value": "Betting Odds Analysis",
            "home_win_rate": "Home Team Record",
            "weather_impact": "Weather Conditions",
            "unknown_feature": "Unknown Feature"
        }
        
        for technical_name, expected_human_name in test_cases.items():
            result = self.engine._humanize_feature_name(technical_name)
            if technical_name in ["odds_value", "home_win_rate", "weather_impact"]:
                self.assertEqual(result, expected_human_name)
            else:
                self.assertIsInstance(result, str)
    
    def test_enhance_game_data(self):
        """Test game data enhancement."""
        # Create game with minimal data
        minimal_game = Game(
            home_team="Team A",
            away_team="Team B",
            league=League.NFL,
            start_time=datetime.now(),
            odds={}
        )
        
        enhanced_game = self.engine._enhance_game_data(minimal_game)
        
        # Should have odds added
        self.assertIsInstance(enhanced_game.odds, dict)
        
        # Original game should be preserved
        self.assertEqual(enhanced_game.home_team, "Team A")
        self.assertEqual(enhanced_game.away_team, "Team B")
    
    def test_generate_rationale(self):
        """Test rationale generation."""
        prediction = ModelPrediction(
            win_probability=0.65,
            confidence_score=75.0,
            expected_value=0.15,
            feature_importance={
                "home_win_rate": 0.3,
                "recent_form_home": 0.25,
                "odds_value": 0.2
            }
        )
        
        features = FeatureVector(
            odds_value=-120,
            home_win_rate=0.7,
            away_win_rate=0.5,
            recent_form_home=0.8,
            recent_form_away=0.4
        )
        
        rationale = self.engine._generate_rationale(
            prediction, features, self.sample_game, "home"
        )
        
        self.assertIsInstance(rationale.reasoning, str)
        self.assertIsInstance(rationale.top_factors, list)
        self.assertGreater(len(rationale.top_factors), 0)
        self.assertIsInstance(rationale.risk_assessment, str)
    
    def test_fallback_pick_generation(self):
        """Test fallback pick generation."""
        try:
            fallback_response = self.engine._generate_fallback_pick(self.sample_request)
            
            self.assertIsNotNone(fallback_response.selection)
            self.assertIsInstance(fallback_response.confidence, float)
            self.assertLessEqual(fallback_response.confidence, 60.0)  # Should be conservative
            self.assertEqual(fallback_response.model_version, "fallback")
            
            print(f"✓ Generated fallback pick: {fallback_response.selection}")
            
        except Exception as e:
            self.fail(f"Fallback pick generation failed: {str(e)}")
    
    def test_is_outdoor_venue(self):
        """Test outdoor venue detection."""
        # Test outdoor venues
        self.assertTrue(self.engine._is_outdoor_venue("Arrowhead Stadium"))
        self.assertTrue(self.engine._is_outdoor_venue("Lambeau Field"))
        
        # Test indoor venues
        self.assertFalse(self.engine._is_outdoor_venue("Mercedes-Benz Superdome"))
        self.assertFalse(self.engine._is_outdoor_venue("Ford Field Indoor Arena"))
    
    def test_multiple_games_analysis(self):
        """Test analysis with multiple games."""
        game2 = Game(
            home_team="Green Bay Packers",
            away_team="Chicago Bears",
            league=League.NFL,
            start_time=datetime(2024, 1, 15, 16, 0),
            odds={
                "home_ml": -140,
                "away_ml": +120
            }
        )
        
        multi_game_request = MLRequest(
            date=date(2024, 1, 15),
            games=[self.sample_game, game2],
            min_confidence=55.0
        )
        
        try:
            response = self.engine.generate_pick(multi_game_request)
            self.assertIsNotNone(response.selection)
            print(f"✓ Multi-game analysis successful: {response.selection}")
            
        except Exception as e:
            self.fail(f"Multi-game analysis failed: {str(e)}")


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete ML pipeline."""
    
    def setUp(self):
        """Set up integration test fixtures."""
        self.engine = MLPredictionEngine()
    
    def test_end_to_end_pipeline(self):
        """Test complete end-to-end ML pipeline."""
        # Create realistic game scenario
        games = [
            Game(
                home_team="Kansas City Chiefs",
                away_team="Buffalo Bills",
                league=League.NFL,
                start_time=datetime(2024, 1, 21, 18, 30),
                odds={
                    "home_ml": -115,
                    "away_ml": -105,
                    "home_spread": -1.5,
                    "away_spread": +1.5
                },
                venue="Arrowhead Stadium",
                weather={
                    "temperature": 32,
                    "wind_speed": 15,
                    "precipitation": 0.0,
                    "conditions": "Clear"
                }
            ),
            Game(
                home_team="San Francisco 49ers",
                away_team="Detroit Lions",
                league=League.NFL,
                start_time=datetime(2024, 1, 21, 15, 0),
                odds={
                    "home_ml": -130,
                    "away_ml": +110
                },
                venue="Levi's Stadium"
            )
        ]
        
        request = MLRequest(
            date=date(2024, 1, 21),
            games=games,
            min_confidence=50.0,
            min_odds=-200,
            max_odds=250
        )
        
        try:
            response = self.engine.generate_pick(request)
            
            # Comprehensive validation
            self.assertIsNotNone(response)
            self.assertIn("ML", response.selection)
            self.assertGreaterEqual(response.confidence, 50.0)
            self.assertIn(response.league, [League.NFL])
            self.assertIsInstance(response.rationale, dict)
            self.assertIn("reasoning", response.rationale)
            self.assertIn("top_factors", response.rationale)
            
            print(f"✓ End-to-end test successful:")
            print(f"  Pick: {response.selection}")
            print(f"  Confidence: {response.confidence}%")
            print(f"  Expected Value: {response.expected_value:.3f}")
            print(f"  Top Factors: {response.rationale.get('top_factors', [])}")
            
        except Exception as e:
            self.fail(f"End-to-end pipeline failed: {str(e)}")


def run_tests():
    """Run all tests and return results."""
    print("Running ML Prediction Engine Tests...")
    print("=" * 50)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestMLPredictionEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"  {test}: {traceback}")
    
    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"  {test}: {traceback}")
    
    success = len(result.failures) == 0 and len(result.errors) == 0
    print(f"\nOverall: {'PASSED' if success else 'FAILED'}")
    
    return success


if __name__ == "__main__":
    run_tests()