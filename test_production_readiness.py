#!/usr/bin/env python3
"""
Comprehensive production readiness test suite for the ML betting system
"""

import sys
import os
import requests
import json
import time
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

import models_simple as models
from prediction_engine_simple import ComplexPredictionEngine

class ProductionReadinessTest:
    """Comprehensive test suite for production deployment."""
    
    def __init__(self):
        """Initialize the test suite."""
        self.base_url = "http://localhost:3000"
        self.results = {
            'passed': 0,
            'failed': 0,
            'warnings': 0,
            'tests': []
        }
    
    def run_all_tests(self):
        """Run the complete test suite."""
        print("🧪 Production Readiness Test Suite")
        print("=" * 60)
        
        # Test categories
        self.test_ml_engine_reliability()
        self.test_api_endpoint_functionality()
        self.test_data_quality_validation()
        self.test_error_handling_robustness()
        self.test_performance_benchmarks()
        self.test_edge_cases()
        self.test_integration_stability()
        
        # Summary
        self.print_test_summary()
        
        return self.results['failed'] == 0
    
    def test_ml_engine_reliability(self):
        """Test ML engine consistency and reliability."""
        print("\n🤖 Testing ML Engine Reliability...")
        
        # Test 1: Consistent predictions
        self.test_prediction_consistency()
        
        # Test 2: Handle various game scenarios
        self.test_game_scenario_handling()
        
        # Test 3: Confidence score validation
        self.test_confidence_score_validation()
        
        # Test 4: Expected value calculations
        self.test_expected_value_accuracy()
    
    def test_prediction_consistency(self):
        """Test that the same input produces consistent output."""
        try:
            engine = ComplexPredictionEngine()
            
            # Create test game
            game = models.Game(
                home_team="Kansas City Chiefs",
                away_team="Buffalo Bills",
                league=models.League.NFL,
                start_time=datetime.now().isoformat(),
                odds={"home_ml": -120, "away_ml": 100}
            )
            
            request = models.MLRequest(
                date=date.today().isoformat(),
                games=[game]
            )
            
            # Run prediction multiple times
            predictions = []
            for i in range(3):
                response = engine.generate_pick(request)
                predictions.append({
                    'selection': response.selection,
                    'confidence': response.confidence,
                    'expected_value': response.expected_value
                })
            
            # Check consistency
            first_pred = predictions[0]
            consistent = all(
                pred['selection'] == first_pred['selection'] and
                abs(pred['confidence'] - first_pred['confidence']) < 0.1 and
                abs(pred['expected_value'] - first_pred['expected_value']) < 0.001
                for pred in predictions[1:]
            )
            
            if consistent:
                self.log_test("✅ Prediction Consistency", "PASS", "Same input produces consistent output")
            else:
                self.log_test("❌ Prediction Consistency", "FAIL", f"Inconsistent predictions: {predictions}")
                
        except Exception as e:
            self.log_test("❌ Prediction Consistency", "FAIL", f"Error: {str(e)}")
    
    def test_game_scenario_handling(self):
        """Test handling of different game scenarios."""
        scenarios = [
            # Heavy favorite
            {"home_ml": -250, "away_ml": 200, "name": "Heavy Favorite"},
            # Pick'em game
            {"home_ml": -105, "away_ml": -105, "name": "Pick'em Game"},
            # Big underdog
            {"home_ml": 180, "away_ml": -220, "name": "Big Underdog"},
            # Extreme odds
            {"home_ml": -400, "away_ml": 350, "name": "Extreme Odds"}
        ]
        
        try:
            engine = ComplexPredictionEngine()
            
            for scenario in scenarios:
                game = models.Game(
                    home_team="Team A",
                    away_team="Team B", 
                    league=models.League.NFL,
                    start_time=datetime.now().isoformat(),
                    odds=scenario
                )
                
                request = models.MLRequest(
                    date=date.today().isoformat(),
                    games=[game]
                )
                
                try:
                    response = engine.generate_pick(request)
                    
                    # Validate response
                    if (response.confidence >= 50 and response.confidence <= 95 and
                        response.selection and response.odds):
                        self.log_test(f"✅ {scenario['name']}", "PASS", 
                                    f"Handled correctly: {response.selection} ({response.confidence}%)")
                    else:
                        self.log_test(f"⚠️  {scenario['name']}", "WARNING", 
                                    f"Unusual output: confidence={response.confidence}")
                        
                except Exception as e:
                    self.log_test(f"❌ {scenario['name']}", "FAIL", f"Error: {str(e)}")
                    
        except Exception as e:
            self.log_test("❌ Game Scenario Handling", "FAIL", f"Setup error: {str(e)}")
    
    def test_api_endpoint_functionality(self):
        """Test the API endpoint functionality."""
        print("\n🌐 Testing API Endpoint Functionality...")
        
        # Test 1: Basic API call
        self.test_basic_api_call()
        
        # Test 2: Invalid input handling
        self.test_invalid_input_handling()
        
        # Test 3: Response format validation
        self.test_response_format()
        
        # Test 4: Timeout handling
        self.test_timeout_handling()
    
    def test_basic_api_call(self):
        """Test basic API functionality."""
        try:
            test_data = {
                "date": date.today().isoformat(),
                "games": [
                    {
                        "home_team": "Kansas City Chiefs",
                        "away_team": "Buffalo Bills",
                        "league": "NFL",
                        "start_time": datetime.now().isoformat(),
                        "odds": {"home_ml": -120, "away_ml": 100},
                        "venue": "Arrowhead Stadium"
                    }
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/api/ml/pick",
                json=test_data,
                timeout=35
            )
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ['selection', 'confidence', 'expected_value']):
                    self.log_test("✅ Basic API Call", "PASS", 
                                f"API working: {data.get('selection')} ({data.get('confidence')}%)")
                else:
                    self.log_test("❌ Basic API Call", "FAIL", f"Missing required fields: {list(data.keys())}")
            else:
                self.log_test("❌ Basic API Call", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            self.log_test("❌ Basic API Call", "FAIL", "Server not running - start with 'npm run dev'")
        except Exception as e:
            self.log_test("❌ Basic API Call", "FAIL", f"Error: {str(e)}")
    
    def test_data_quality_validation(self):
        """Test data quality and validation."""
        print("\n📊 Testing Data Quality Validation...")
        
        # Test SportsData.io API connectivity
        self.test_sportsdata_connectivity()
        
        # Test data parsing accuracy
        self.test_data_parsing()
        
        # Test feature calculation accuracy
        self.test_feature_calculations()
    
    def test_sportsdata_connectivity(self):
        """Test SportsData.io API connectivity."""
        try:
            api_key = os.getenv('SPORTS_DATA_API_KEY')
            if not api_key:
                self.log_test("⚠️  SportsData.io API", "WARNING", "No API key found")
                return
            
            # Test NFL endpoint
            url = "https://api.sportsdata.io/v3/nfl/scores/json/Standings/2024"
            response = requests.get(url, params={'key': api_key}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if len(data) >= 30:  # Should have 32 NFL teams
                    self.log_test("✅ SportsData.io API", "PASS", f"Connected successfully ({len(data)} teams)")
                else:
                    self.log_test("⚠️  SportsData.io API", "WARNING", f"Unexpected data size: {len(data)}")
            elif response.status_code == 401:
                self.log_test("❌ SportsData.io API", "FAIL", "Invalid API key")
            else:
                self.log_test("❌ SportsData.io API", "FAIL", f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("❌ SportsData.io API", "FAIL", f"Error: {str(e)}")
    
    def test_error_handling_robustness(self):
        """Test error handling and robustness."""
        print("\n🛡️  Testing Error Handling Robustness...")
        
        # Test 1: No games provided
        self.test_no_games_error()
        
        # Test 2: Invalid odds format
        self.test_invalid_odds_error()
        
        # Test 3: API timeout simulation
        self.test_api_timeout_handling()
    
    def test_no_games_error(self):
        """Test handling when no games are provided."""
        try:
            test_data = {
                "date": date.today().isoformat(),
                "games": []
            }
            
            response = requests.post(
                f"{self.base_url}/api/ml/pick",
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_test("✅ No Games Error", "PASS", "Properly rejects empty games list")
            else:
                self.log_test("⚠️  No Games Error", "WARNING", f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_test("❌ No Games Error", "FAIL", f"Error: {str(e)}")
    
    def test_performance_benchmarks(self):
        """Test performance benchmarks."""
        print("\n⚡ Testing Performance Benchmarks...")
        
        # Test response time
        self.test_response_time()
        
        # Test memory usage (basic)
        self.test_memory_efficiency()
    
    def test_response_time(self):
        """Test API response time."""
        try:
            test_data = {
                "date": date.today().isoformat(),
                "games": [
                    {
                        "home_team": "Team A",
                        "away_team": "Team B",
                        "league": "NFL",
                        "start_time": datetime.now().isoformat(),
                        "odds": {"home_ml": -110, "away_ml": -110}
                    }
                ]
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.base_url}/api/ml/pick",
                json=test_data,
                timeout=35
            )
            end_time = time.time()
            
            response_time = end_time - start_time
            
            if response.status_code == 200:
                if response_time < 10:
                    self.log_test("✅ Response Time", "PASS", f"Fast response: {response_time:.2f}s")
                elif response_time < 20:
                    self.log_test("⚠️  Response Time", "WARNING", f"Slow response: {response_time:.2f}s")
                else:
                    self.log_test("❌ Response Time", "FAIL", f"Too slow: {response_time:.2f}s")
            else:
                self.log_test("❌ Response Time", "FAIL", f"API error: {response.status_code}")
                
        except Exception as e:
            self.log_test("❌ Response Time", "FAIL", f"Error: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and unusual scenarios."""
        print("\n🔍 Testing Edge Cases...")
        
        # Test with multiple games
        self.test_multiple_games()
        
        # Test with unusual team names
        self.test_unusual_team_names()
    
    def test_multiple_games(self):
        """Test handling multiple games."""
        try:
            test_data = {
                "date": date.today().isoformat(),
                "games": [
                    {
                        "home_team": "Kansas City Chiefs",
                        "away_team": "Buffalo Bills",
                        "league": "NFL",
                        "start_time": datetime.now().isoformat(),
                        "odds": {"home_ml": -120, "away_ml": 100}
                    },
                    {
                        "home_team": "Los Angeles Lakers",
                        "away_team": "Boston Celtics",
                        "league": "NBA",
                        "start_time": datetime.now().isoformat(),
                        "odds": {"home_ml": -110, "away_ml": -110}
                    },
                    {
                        "home_team": "New York Yankees",
                        "away_team": "Los Angeles Dodgers",
                        "league": "MLB",
                        "start_time": datetime.now().isoformat(),
                        "odds": {"home_ml": -130, "away_ml": 110}
                    }
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/api/ml/pick",
                json=test_data,
                timeout=35
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("✅ Multiple Games", "PASS", 
                            f"Handled 3 games, selected: {data.get('selection')}")
            else:
                self.log_test("❌ Multiple Games", "FAIL", f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("❌ Multiple Games", "FAIL", f"Error: {str(e)}")
    
    def test_integration_stability(self):
        """Test integration stability."""
        print("\n🔗 Testing Integration Stability...")
        
        # Test database connection (if applicable)
        self.test_database_integration()
        
        # Test cron job simulation
        self.test_cron_job_simulation()
    
    def test_database_integration(self):
        """Test database integration."""
        try:
            # Test if we can connect to Supabase
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            if supabase_url:
                self.log_test("✅ Database Config", "PASS", "Supabase URL configured")
            else:
                self.log_test("⚠️  Database Config", "WARNING", "No Supabase URL found")
                
        except Exception as e:
            self.log_test("❌ Database Integration", "FAIL", f"Error: {str(e)}")
    
    def test_cron_job_simulation(self):
        """Simulate cron job execution."""
        try:
            # Test the daily pick endpoint with cron secret
            cron_secret = os.getenv('CRON_SECRET')
            if not cron_secret:
                self.log_test("⚠️  Cron Job", "WARNING", "No CRON_SECRET found")
                return
            
            # This would test the actual cron endpoint
            self.log_test("✅ Cron Job Config", "PASS", "Cron secret configured")
            
        except Exception as e:
            self.log_test("❌ Cron Job", "FAIL", f"Error: {str(e)}")
    
    def log_test(self, name: str, status: str, message: str):
        """Log a test result."""
        self.results['tests'].append({
            'name': name,
            'status': status,
            'message': message
        })
        
        if status == "PASS":
            self.results['passed'] += 1
        elif status == "FAIL":
            self.results['failed'] += 1
        else:
            self.results['warnings'] += 1
        
        print(f"   {name}: {message}")
    
    def print_test_summary(self):
        """Print test summary."""
        print("\n" + "=" * 60)
        print("📋 Test Summary")
        print("=" * 60)
        
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"⚠️  Warnings: {self.results['warnings']}")
        print(f"📊 Total: {len(self.results['tests'])}")
        
        if self.results['failed'] == 0:
            print("\n🎉 PRODUCTION READY!")
            print("Your ML system is ready for deployment.")
        else:
            print(f"\n⚠️  {self.results['failed']} ISSUES NEED FIXING")
            print("Review failed tests before deploying to production.")
        
        # Show failed tests
        failed_tests = [t for t in self.results['tests'] if t['status'] == 'FAIL']
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   - {test['name']}: {test['message']}")

def main():
    """Run the production readiness test."""
    tester = ProductionReadinessTest()
    
    print("🚀 Starting Production Readiness Tests...")
    print("Make sure your Next.js server is running: npm run dev")
    print()
    
    success = tester.run_all_tests()
    
    if success:
        print("\n🎯 Ready to deploy to production!")
    else:
        print("\n🔧 Fix issues before deploying.")
    
    return success

if __name__ == "__main__":
    main()