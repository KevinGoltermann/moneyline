#!/usr/bin/env python3
"""
Backtest MLB games from today to validate ML algorithm accuracy
"""

import sys
import os
import requests
import json
from datetime import datetime, date
from typing import List, Dict, Any, Optional

# Add the ML pick directory to Python path
ml_pick_dir = os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'ml', 'pick')
sys.path.insert(0, ml_pick_dir)

import models_simple as models
from prediction_engine_simple import ComplexPredictionEngine

class MLBBacktester:
    """Backtest MLB games using our ML algorithm."""
    
    def __init__(self):
        """Initialize the backtester."""
        self.api_key = os.getenv('SPORTS_DATA_API_KEY', '14fafb2f0bff4b938184e428473cdd20')
        self.ml_engine = ComplexPredictionEngine()
        self.base_url = "https://api.sportsdata.io/v3/mlb"
        
    def get_todays_mlb_games(self) -> List[Dict[str, Any]]:
        """Fetch today's MLB games from SportsData.io with detailed scores."""
        try:
            today = date.today().isoformat()
            
            # Try the detailed scores endpoint first
            detailed_url = f"{self.base_url}/scores/json/ScoresByDate/{today}"
            basic_url = f"{self.base_url}/scores/json/GamesByDate/{today}"
            params = {'key': self.api_key}
            
            print(f"📡 Fetching detailed MLB scores for {today}...")
            
            # Try detailed endpoint first
            response = requests.get(detailed_url, params=params, timeout=10)
            
            if response.status_code == 200:
                games = response.json()
                print(f"✅ Found {len(games)} MLB games (detailed)")
                
                if games:
                    print(f"🔍 Debug - First detailed game:")
                    first_game = games[0]
                    print(f"   HomeTeam: {first_game.get('HomeTeam', 'N/A')}")
                    print(f"   AwayTeam: {first_game.get('AwayTeam', 'N/A')}")
                    print(f"   Status: {first_game.get('Status', 'N/A')}")
                    
                    # Look for score fields
                    score_fields = [k for k in first_game.keys() if any(word in k.lower() for word in ['score', 'run'])]
                    print(f"   Score fields: {score_fields}")
                    for field in score_fields:
                        print(f"   {field}: {first_game.get(field)}")
                
                return games
                
            else:
                print(f"⚠️  Detailed endpoint failed ({response.status_code}), trying basic...")
                
                # Fallback to basic endpoint
                response = requests.get(basic_url, params=params, timeout=10)
                
                if response.status_code == 200:
                    games = response.json()
                    print(f"✅ Found {len(games)} MLB games (basic)")
                    return games
                elif response.status_code == 401:
                    print("❌ Invalid API key")
                    return []
                else:
                    print(f"❌ API Error: {response.status_code}")
                    return []
                
        except Exception as e:
            print(f"❌ Error fetching games: {str(e)}")
            return []
    
    def convert_to_ml_format(self, sportsdata_games: List[Dict]) -> tuple:
        """Convert SportsData.io format to our ML format."""
        ml_games = []
        game_results = {}  # Separate tracking for results
        
        for game in sportsdata_games:
            try:
                # Skip games that haven't started or don't have odds
                if not game.get('HomeTeam') or not game.get('AwayTeam'):
                    continue
                
                # Create mock odds (in real backtest, you'd get historical odds)
                home_team = game['HomeTeam']
                away_team = game['AwayTeam']
                
                # Generate realistic odds based on team strength
                home_odds, away_odds = self._generate_realistic_odds(home_team, away_team)
                
                ml_game = models.Game(
                    home_team=home_team,
                    away_team=away_team,
                    league=models.League.MLB,
                    start_time=game.get('DateTime', datetime.now().isoformat()),
                    odds={
                        "home_ml": home_odds,
                        "away_ml": away_odds
                    },
                    venue=game.get('StadiumDetails', {}).get('Name', 'Unknown Stadium')
                )
                
                # Store result separately - try to get detailed score if available
                game_key = f"{away_team}@{home_team}"
                result = self._get_actual_result(game)
                
                # If we didn't get a score, try to fetch it separately
                if result.get('home_score') == 0 and result.get('away_score') == 0 and result.get('status') == 'Final':
                    detailed_result = self._fetch_detailed_game_result(game)
                    if detailed_result:
                        result = detailed_result
                
                game_results[game_key] = result
                
                ml_games.append(ml_game)
                
            except Exception as e:
                print(f"⚠️  Error converting game: {str(e)}")
                continue
        
        return ml_games, game_results
    
    def _generate_realistic_odds(self, home_team: str, away_team: str) -> tuple:
        """Generate realistic odds based on team names."""
        # Strong teams get better odds
        strong_teams = {
            'dodgers': 0.8, 'yankees': 0.75, 'astros': 0.7, 'braves': 0.7,
            'mets': 0.65, 'phillies': 0.65, 'padres': 0.6, 'blue jays': 0.6
        }
        
        weak_teams = {
            'athletics': 0.3, 'royals': 0.35, 'marlins': 0.35, 'pirates': 0.4,
            'tigers': 0.4, 'nationals': 0.4, 'angels': 0.45
        }
        
        home_strength = 0.5  # Default
        away_strength = 0.5
        
        # Check team strength
        for team, strength in strong_teams.items():
            if team in home_team.lower():
                home_strength = strength
            if team in away_team.lower():
                away_strength = strength
        
        for team, strength in weak_teams.items():
            if team in home_team.lower():
                home_strength = strength
            if team in away_team.lower():
                away_strength = strength
        
        # Add home field advantage
        home_strength += 0.05
        
        # Convert to odds
        if home_strength > away_strength:
            # Home team favored
            diff = home_strength - away_strength
            home_odds = int(-110 - (diff * 200))  # Favorite gets negative odds
            away_odds = int(110 + (diff * 200))   # Underdog gets positive odds
        else:
            # Away team favored
            diff = away_strength - home_strength
            home_odds = int(110 + (diff * 200))
            away_odds = int(-110 - (diff * 200))
        
        # Clamp odds to reasonable ranges
        home_odds = max(-300, min(300, home_odds))
        away_odds = max(-300, min(300, away_odds))
        
        return home_odds, away_odds
    
    def _get_actual_result(self, game: Dict) -> Dict[str, Any]:
        """Extract actual game result."""
        try:
            # Debug: Print the game data structure
            print(f"🔍 Debug - Game data keys: {list(game.keys())}")
            
            # Look for any field that might contain scores
            score_fields = [k for k in game.keys() if any(word in k.lower() for word in ['score', 'run', 'point'])]
            print(f"🔍 Debug - Score-related fields: {score_fields}")
            for field in score_fields:
                print(f"   {field}: {game.get(field)}")
            
            # For MLB, scores are likely in 'Runs' fields
            home_score = (game.get('HomeRuns') or 
                         game.get('HomeScore') or 
                         game.get('HomeTeamRuns') or 
                         game.get('HomeTeamScore') or 0)
            
            away_score = (game.get('AwayRuns') or 
                         game.get('AwayScore') or 
                         game.get('AwayTeamRuns') or 
                         game.get('AwayTeamScore') or 0)
            
            # Try different status field names
            status = (game.get('Status') or 
                     game.get('GameStatus') or 
                     game.get('StatusValue') or 
                     game.get('GameEndDateTime') and 'Final' or
                     'Scheduled')
            
            print(f"🔍 Debug - Parsed: Status={status}, Home={home_score}, Away={away_score}")
            
            # Check for final game status
            final_statuses = ['Final', 'Completed', 'F', 'Final/OT', 'Final/SO']
            is_final = status in final_statuses
            
            if is_final and home_score is not None and away_score is not None:
                try:
                    home_score = int(home_score)
                    away_score = int(away_score)
                    
                    if home_score > away_score:
                        winner = 'home'
                    elif away_score > home_score:
                        winner = 'away'
                    else:
                        winner = 'tie'
                    
                    return {
                        'status': 'Final',
                        'home_score': home_score,
                        'away_score': away_score,
                        'winner': winner,
                        'result': winner
                    }
                except (ValueError, TypeError):
                    print(f"⚠️  Could not convert scores to integers: home={home_score}, away={away_score}")
            
            return {
                'status': status,
                'home_score': home_score,
                'away_score': away_score,
                'winner': None,
                'result': 'Pending'
            }
                
        except Exception as e:
            print(f"⚠️  Error parsing game result: {str(e)}")
            return {'status': 'Unknown', 'result': 'Pending'}
    
    def run_backtest(self):
        """Run the complete backtest."""
        print("🏈 MLB ML Algorithm Backtest")
        print("=" * 60)
        
        # Get today's games
        sportsdata_games = self.get_todays_mlb_games()
        if not sportsdata_games:
            print("❌ No games found for today")
            return
        
        # Convert to ML format
        ml_games, game_results = self.convert_to_ml_format(sportsdata_games)
        if not ml_games:
            print("❌ No valid games to analyze")
            return
        
        print(f"\n🔍 Analyzing {len(ml_games)} MLB games...")
        
        # Show the games we're analyzing
        print("\n📋 Today's MLB Games:")
        for i, game in enumerate(ml_games[:5], 1):  # Show first 5
            game_key = f"{game.away_team}@{game.home_team}"
            result = game_results.get(game_key, {})
            status = result.get('status', 'Unknown')
            print(f"   {i}. {game.away_team} @ {game.home_team} ({status})")
        
        if len(ml_games) > 5:
            print(f"   ... and {len(ml_games) - 5} more games")
        
        # Create ML request
        ml_request = models.MLRequest(
            date=date.today().isoformat(),
            games=ml_games,
            min_confidence=60.0
        )
        
        # Generate ML prediction
        try:
            print("\n🤖 Generating ML prediction...")
            prediction = self.ml_engine.generate_pick(ml_request)
            
            print("\n📊 ML Algorithm Prediction:")
            print(f"   Selection: {prediction.selection}")
            print(f"   Confidence: {prediction.confidence}%")
            print(f"   Expected Value: {prediction.expected_value:.4f}")
            print(f"   Odds: {prediction.odds}")
            
            rationale = prediction.rationale
            print(f"\n🧠 Analysis:")
            print(f"   Reasoning: {rationale.get('reasoning', 'N/A')}")
            print(f"   Top Factors: {', '.join(rationale.get('top_factors', []))}")
            print(f"   Risk Assessment: {rationale.get('risk_assessment', 'N/A')}")
            
            # Find the predicted game and check result
            predicted_team = prediction.selection.replace(' ML', '')
            predicted_game = None
            
            for game in ml_games:
                if predicted_team in [game.home_team, game.away_team]:
                    predicted_game = game
                    break
            
            if predicted_game:
                game_key = f"{predicted_game.away_team}@{predicted_game.home_team}"
                result = game_results.get(game_key, {})
                
                print(f"\n🎯 Backtest Result:")
                print(f"   Game: {predicted_game.away_team} @ {predicted_game.home_team}")
                print(f"   Status: {result.get('status', 'Unknown')}")
                
                if result.get('status') == 'Final':
                    home_score = result.get('home_score', 0)
                    away_score = result.get('away_score', 0)
                    winner = result.get('winner', 'unknown')
                    
                    print(f"   Final Score: {predicted_game.away_team} {away_score} - {predicted_game.home_team} {home_score}")
                    
                    # Check if prediction was correct
                    predicted_side = 'home' if predicted_team == predicted_game.home_team else 'away'
                    correct = (predicted_side == winner)
                    
                    print(f"   Predicted: {predicted_team}")
                    print(f"   Actual Winner: {predicted_game.home_team if winner == 'home' else predicted_game.away_team}")
                    print(f"   ✅ CORRECT!" if correct else "❌ INCORRECT")
                    
                    if correct:
                        print(f"   💰 Profit: {self._calculate_profit(prediction.odds):.2f} units")
                    else:
                        print(f"   💸 Loss: -1.00 units")
                        
                else:
                    print(f"   ⏳ Game not finished yet - check back later")
            else:
                print(f"\n⚠️  Could not find predicted game for result checking")
            
        except Exception as e:
            print(f"❌ Error generating prediction: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _fetch_detailed_game_result(self, game: Dict) -> Optional[Dict[str, Any]]:
        """Fetch detailed game result if basic data doesn't have scores."""
        try:
            game_id = game.get('GameID')
            if not game_id:
                return None
            
            # Try to get detailed game data
            url = f"{self.base_url}/scores/json/BoxScore/{game_id}"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                detailed_game = response.json()
                
                # Extract scores from detailed data
                if isinstance(detailed_game, dict):
                    home_score = (detailed_game.get('HomeScore') or 
                                 detailed_game.get('HomeRuns') or 
                                 detailed_game.get('Game', {}).get('HomeScore') or 0)
                    
                    away_score = (detailed_game.get('AwayScore') or 
                                 detailed_game.get('AwayRuns') or 
                                 detailed_game.get('Game', {}).get('AwayScore') or 0)
                    
                    if home_score and away_score:
                        home_score = int(home_score)
                        away_score = int(away_score)
                        
                        if home_score > away_score:
                            winner = 'home'
                        elif away_score > home_score:
                            winner = 'away'
                        else:
                            winner = 'tie'
                        
                        return {
                            'status': 'Final',
                            'home_score': home_score,
                            'away_score': away_score,
                            'winner': winner,
                            'result': winner
                        }
            
            # If SportsData.io doesn't work, try ESPN API as backup
            return self._fetch_espn_score(game)
            
        except Exception as e:
            print(f"⚠️  Error fetching detailed game result: {str(e)}")
            return self._fetch_espn_score(game)
    
    def _fetch_espn_score(self, game: Dict) -> Optional[Dict[str, Any]]:
        """Fetch score from ESPN API as backup."""
        try:
            home_team = game.get('HomeTeam', '')
            away_team = game.get('AwayTeam', '')
            
            if not home_team or not away_team:
                return None
            
            # ESPN API endpoint for MLB scores
            today = date.today().isoformat()
            espn_url = f"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"
            params = {'dates': today.replace('-', '')}  # ESPN uses YYYYMMDD format
            
            response = requests.get(espn_url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                events = data.get('events', [])
                
                for event in events:
                    competitions = event.get('competitions', [])
                    for competition in competitions:
                        competitors = competition.get('competitors', [])
                        
                        if len(competitors) >= 2:
                            home_competitor = next((c for c in competitors if c.get('homeAway') == 'home'), None)
                            away_competitor = next((c for c in competitors if c.get('homeAway') == 'away'), None)
                            
                            if home_competitor and away_competitor:
                                home_name = home_competitor.get('team', {}).get('displayName', '')
                                away_name = away_competitor.get('team', {}).get('displayName', '')
                                
                                # Check if this matches our game (fuzzy match)
                                if (any(word in home_name.lower() for word in home_team.lower().split()) and
                                    any(word in away_name.lower() for word in away_team.lower().split())):
                                    
                                    home_score = int(home_competitor.get('score', 0))
                                    away_score = int(away_competitor.get('score', 0))
                                    status = competition.get('status', {}).get('type', {}).get('description', '')
                                    
                                    if 'Final' in status and (home_score > 0 or away_score > 0):
                                        winner = 'home' if home_score > away_score else 'away' if away_score > home_score else 'tie'
                                        
                                        print(f"✅ Found ESPN score: {away_name} {away_score} - {home_name} {home_score}")
                                        
                                        return {
                                            'status': 'Final',
                                            'home_score': home_score,
                                            'away_score': away_score,
                                            'winner': winner,
                                            'result': winner
                                        }
            
            return None
            
        except Exception as e:
            print(f"⚠️  Error fetching ESPN score: {str(e)}")
            return None
    
    def _calculate_profit(self, odds: float) -> float:
        """Calculate profit from winning bet."""
        if odds > 0:
            return odds / 100  # Profit on $1 bet
        else:
            return 100 / abs(odds)  # Profit on $1 bet

def main():
    """Run the MLB backtest."""
    backtester = MLBBacktester()
    backtester.run_backtest()
    
    print("\n" + "=" * 60)
    print("🎯 Backtest Complete!")
    print("This validates how well our ML algorithm performs on real games.")

if __name__ == "__main__":
    main()