#!/usr/bin/env python3
"""
Test staging environment before production deployment
"""

import requests
import json
import time
from datetime import datetime, date

def test_staging_environment(staging_url):
    """Test the staging environment thoroughly."""
    
    print(f"🧪 Testing Staging Environment: {staging_url}")
    print("=" * 60)
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Health check
    print("\n1️⃣ Health Check...")
    try:
        response = requests.get(f"{staging_url}/api/ml/pick", timeout=10)
        if response.status_code == 200:
            print("   ✅ API endpoint accessible")
            tests_passed += 1
        else:
            print(f"   ❌ API endpoint error: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ Health check failed: {str(e)}")
        tests_failed += 1
    
    # Test 2: ML prediction
    print("\n2️⃣ ML Prediction Test...")
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
        
        start_time = time.time()
        response = requests.post(
            f"{staging_url}/api/ml/pick",
            json=test_data,
            timeout=35
        )
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            response_time = end_time - start_time
            
            print(f"   ✅ ML prediction successful")
            print(f"   📊 Selection: {data.get('selection', 'N/A')}")
            print(f"   📊 Confidence: {data.get('confidence', 'N/A')}%")
            print(f"   📊 Model Version: {data.get('model_version', 'N/A')}")
            print(f"   ⏱️  Response Time: {response_time:.2f}s")
            
            # Validate response structure
            required_fields = ['selection', 'confidence', 'expected_value', 'rationale']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                print("   ✅ Response structure valid")
                tests_passed += 1
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
                tests_failed += 1
                
            # Check if using complex model
            if 'complex' in data.get('model_version', '').lower():
                print("   ✅ Using complex ML model")
                tests_passed += 1
            else:
                print(f"   ⚠️  Using fallback model: {data.get('model_version', 'Unknown')}")
                tests_failed += 1
                
        else:
            print(f"   ❌ ML prediction failed: {response.status_code}")
            print(f"   Response: {response.text}")
            tests_failed += 1
            
    except Exception as e:
        print(f"   ❌ ML prediction error: {str(e)}")
        tests_failed += 1
    
    # Test 3: Error handling
    print("\n3️⃣ Error Handling Test...")
    try:
        # Send invalid data
        invalid_data = {"invalid": "data"}
        
        response = requests.post(
            f"{staging_url}/api/ml/pick",
            json=invalid_data,
            timeout=10
        )
        
        if response.status_code in [400, 422]:
            print("   ✅ Properly handles invalid input")
            tests_passed += 1
        else:
            print(f"   ❌ Unexpected response to invalid input: {response.status_code}")
            tests_failed += 1
            
    except Exception as e:
        print(f"   ❌ Error handling test failed: {str(e)}")
        tests_failed += 1
    
    # Test 4: Load test (basic)
    print("\n4️⃣ Basic Load Test...")
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
        
        # Send 3 concurrent requests
        import concurrent.futures
        
        def make_request():
            return requests.post(
                f"{staging_url}/api/ml/pick",
                json=test_data,
                timeout=35
            )
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request) for _ in range(3)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_responses = [r for r in responses if r.status_code == 200]
        
        if len(successful_responses) == 3:
            print("   ✅ Handles concurrent requests")
            tests_passed += 1
        else:
            print(f"   ❌ Load test failed: {len(successful_responses)}/3 successful")
            tests_failed += 1
            
    except Exception as e:
        print(f"   ❌ Load test error: {str(e)}")
        tests_failed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Staging Test Summary")
    print("=" * 60)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📊 Total: {tests_passed + tests_failed}")
    
    if tests_failed == 0:
        print("\n🎉 STAGING ENVIRONMENT READY!")
        print("Safe to deploy to production.")
        return True
    else:
        print(f"\n⚠️  {tests_failed} ISSUES FOUND")
        print("Fix issues before production deployment.")
        return False

def main():
    """Main function."""
    print("🚀 Staging Environment Test")
    print("This tests your deployed staging environment before going to production.")
    print()
    
    # You can test different environments
    environments = {
        "local": "http://localhost:3000",
        "staging": "https://your-staging-url.vercel.app",  # Replace with your staging URL
        "preview": "https://your-preview-url.vercel.app"   # Replace with your preview URL
    }
    
    print("Available environments:")
    for name, url in environments.items():
        print(f"  {name}: {url}")
    
    print()
    env_choice = input("Enter environment to test (local/staging/preview) or custom URL: ").strip()
    
    if env_choice in environments:
        test_url = environments[env_choice]
    elif env_choice.startswith('http'):
        test_url = env_choice
    else:
        test_url = environments['local']  # Default to local
    
    success = test_staging_environment(test_url)
    
    if success:
        print("\n🎯 Ready for production deployment!")
    else:
        print("\n🔧 Fix staging issues first.")

if __name__ == "__main__":
    main()