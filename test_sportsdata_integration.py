#!/usr/bin/env python3
"""
Quick test script to verify SportsData.io integration.
Run this from the project root: python test_sportsdata_integration.py
"""

import os
import sys
from datetime import datetime

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

# Import modules individually to avoid circular imports
import models
import external_apis

League = models.League
Game = models.Game
SportsDataAPI = external_apis.SportsDataAPI

def test_sportsdata_integration():
    """Test SportsData.io API integration."""
    print("🏈 Testing SportsData.io Integration...")
    print("=" * 50)
    
    # Initialize API client
    api = SportsDataAPI()
    
    if not api.api_key:
        print("❌ No SportsData.io API key found!")
        print("Please add SPORTS_DATA_API_KEY to your .env.local file")
        return False
    
    print(f"✅ API Key found: {api.api_key[:8]}...")
    
    # Test team stats
    print("\n📊 Testing Team Stats...")
    try:
        team_stats = api.get_team_stats("Kansas City Chiefs", League.NFL)
        if team_stats:
            print(f"✅ Team Stats Retrieved:")
            print(f"   Team: {team_stats.get('team_name', 'Unknown')}")
            print(f"   Record: {team_stats.get('wins', 0)}-{team_stats.get('losses', 0)}")
            print(f"   Win %: {team_stats.get('win_percentage', 0):.3f}")
            print(f"   PPG: {team_stats.get('points_per_game', 0):.1f}")
            print(f"   Offensive Rating: {team_stats.get('offensive_rating', 100):.1f}")
        else:
            print("⚠️  No team stats retrieved (using fallback)")
    except Exception as e:
        print(f"❌ Team Stats Error: {str(e)}")
    
    # Test injury reports
    print("\n🏥 Testing Injury Reports...")
    try:
        injuries = api.get_injury_report("Kansas City Chiefs", League.NFL)
        if injuries:
            print(f"✅ Injury Report Retrieved ({len(injuries)} injuries):")
            for injury in injuries[:3]:  # Show first 3
                print(f"   {injury.get('player', 'Unknown')}: {injury.get('status', 'Unknown')} ({injury.get('injury', 'Unknown')})")
        else:
            print("⚠️  No injuries retrieved (using fallback)")
    except Exception as e:
        print(f"❌ Injury Report Error: {str(e)}")
    
    # Test recent games
    print("\n🎮 Testing Recent Games...")
    try:
        recent_games = api.get_recent_games("Kansas City Chiefs", League.NFL, 5)
        if recent_games:
            print(f"✅ Recent Games Retrieved ({len(recent_games)} games):")
            for game in recent_games[:3]:  # Show first 3
                print(f"   {game.get('result', 'U')} vs {game.get('opponent', 'Unknown')} ({game.get('score_for', 0)}-{game.get('score_against', 0)})")
        else:
            print("⚠️  No recent games retrieved (using fallback)")
    except Exception as e:
        print(f"❌ Recent Games Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎯 Integration test complete!")
    print("If you see API errors above, the system will use enhanced mock data as fallback.")
    print("The ML algorithm will work with either real or mock data.")
    
    return True

if __name__ == "__main__":
    test_sportsdata_integration()