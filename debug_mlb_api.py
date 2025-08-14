#!/usr/bin/env python3
"""
Debug script to see what MLB data we get from SportsData.io
"""

import os
import requests
import json
from datetime import date

def debug_mlb_api():
    """Debug the MLB API response."""
    
    api_key = os.getenv('SPORTS_DATA_API_KEY', '14fafb2f0bff4b938184e428473cdd20')
    base_url = "https://api.sportsdata.io/v3/mlb"
    
    print("🔍 Debugging MLB API Response")
    print("=" * 50)
    
    # Try today's games
    today = date.today().isoformat()
    url = f"{base_url}/scores/json/GamesByDate/{today}"
    params = {'key': api_key}
    
    print(f"📡 Fetching: {url}")
    print(f"🗓️  Date: {today}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            games = response.json()
            print(f"✅ API Success: {len(games)} games found")
            
            if games:
                print(f"\n📋 First Game Details:")
                first_game = games[0]
                
                # Print all fields in a readable format
                for key, value in sorted(first_game.items()):
                    print(f"   {key}: {value}")
                
                print(f"\n🎯 Key Fields for Backtesting:")
                print(f"   HomeTeam: {first_game.get('HomeTeam', 'N/A')}")
                print(f"   AwayTeam: {first_game.get('AwayTeam', 'N/A')}")
                print(f"   Status: {first_game.get('Status', 'N/A')}")
                print(f"   HomeScore: {first_game.get('HomeScore', 'N/A')}")
                print(f"   AwayScore: {first_game.get('AwayScore', 'N/A')}")
                print(f"   DateTime: {first_game.get('DateTime', 'N/A')}")
                
                # Check if there are any completed games
                completed_games = [g for g in games if g.get('Status') in ['Final', 'Completed', 'F']]
                print(f"\n📊 Game Status Summary:")
                print(f"   Total Games: {len(games)}")
                print(f"   Completed: {len(completed_games)}")
                print(f"   In Progress/Scheduled: {len(games) - len(completed_games)}")
                
                if completed_games:
                    print(f"\n🏆 Sample Completed Game:")
                    completed = completed_games[0]
                    print(f"   {completed.get('AwayTeam', 'Away')} {completed.get('AwayScore', 0)} - {completed.get('HomeTeam', 'Home')} {completed.get('HomeScore', 0)}")
                    print(f"   Status: {completed.get('Status', 'Unknown')}")
            
            else:
                print("❌ No games found for today")
                
                # Try yesterday
                from datetime import timedelta
                yesterday = (date.today() - timedelta(days=1)).isoformat()
                print(f"\n🔄 Trying yesterday ({yesterday})...")
                
                url_yesterday = f"{base_url}/scores/json/GamesByDate/{yesterday}"
                response_yesterday = requests.get(url_yesterday, params=params, timeout=10)
                
                if response_yesterday.status_code == 200:
                    yesterday_games = response_yesterday.json()
                    print(f"✅ Yesterday: {len(yesterday_games)} games found")
                    
                    if yesterday_games:
                        completed_yesterday = [g for g in yesterday_games if g.get('Status') in ['Final', 'Completed', 'F']]
                        print(f"   Completed yesterday: {len(completed_yesterday)}")
                        
                        if completed_yesterday:
                            sample = completed_yesterday[0]
                            print(f"   Sample: {sample.get('AwayTeam', 'Away')} {sample.get('AwayScore', 0)} - {sample.get('HomeTeam', 'Home')} {sample.get('HomeScore', 0)}")
        
        elif response.status_code == 401:
            print("❌ API Key invalid or expired")
        elif response.status_code == 429:
            print("❌ Rate limit exceeded")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    debug_mlb_api()