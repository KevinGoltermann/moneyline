#!/usr/bin/env python3
"""
Simple test for SportsData.io API key
"""

import os
import requests
from datetime import datetime

def test_sportsdata_api():
    """Test SportsData.io API directly"""
    
    # Get API key from environment
    api_key = os.getenv('SPORTS_DATA_API_KEY', '14fafb2f0bff4b938184e428473cdd20')
    
    if not api_key:
        print("❌ No API key found!")
        return False
    
    print(f"✅ API Key found: {api_key[:8]}...")
    
    # Test NFL standings endpoint
    try:
        url = "https://api.sportsdata.io/v3/nfl/scores/json/Standings/2024"
        params = {'key': api_key}
        
        print("🏈 Testing NFL standings endpoint...")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response successful! Got {len(data)} teams")
            
            # Show first team as example
            if data:
                team = data[0]
                print(f"   Example: {team.get('City', '')} {team.get('Name', '')} - {team.get('Wins', 0)}-{team.get('Losses', 0)}")
            
            return True
        elif response.status_code == 401:
            print("❌ API Key invalid or expired")
            return False
        elif response.status_code == 429:
            print("⚠️  Rate limit exceeded")
            return False
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ API request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Simple SportsData.io API Test")
    print("=" * 40)
    
    success = test_sportsdata_api()
    
    print("\n" + "=" * 40)
    if success:
        print("🎯 API test successful! SportsData.io is working.")
    else:
        print("⚠️  API test failed, but the system will use mock data as fallback.")
    
    print("The ML algorithm will work either way!")