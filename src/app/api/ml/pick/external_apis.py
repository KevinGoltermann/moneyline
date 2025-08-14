"""
External API integration stubs for odds and weather data.

This module provides interfaces to external data sources needed for
ML betting predictions, including odds providers and weather services.
"""

import os
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date, timedelta
import json

# These would be actual HTTP clients in production
# For now, we'll use stubs that return mock data
try:
    import requests
    import httpx
except ImportError:
    # Fallback for environments without these packages
    requests = None
    httpx = None

try:
    from .models import Game, League, ExternalAPIError
except ImportError:
    from models import Game, League, ExternalAPIError


logger = logging.getLogger(__name__)


class OddsAPI:
    """Interface to odds data providers (The Odds API, etc.)."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize odds API client."""
        self.api_key = api_key or os.getenv('ODDS_API_KEY')
        self.base_url = "https://api.the-odds-api.com/v4"
        self.timeout = 10
        self.rate_limit_delay = 1  # seconds between requests
        
    def get_games_for_date(
        self, 
        target_date: date, 
        leagues: Optional[List[League]] = None
    ) -> List[Game]:
        """
        Fetch available games for a specific date.
        
        Args:
            target_date: Date to fetch games for
            leagues: Optional list of leagues to filter by
            
        Returns:
            List of Game objects with odds data
        """
        try:
            # For now, return mock data
            # In production, this would make actual API calls
            return self._get_mock_games(target_date, leagues)
            
        except Exception as e:
            logger.error(f"Error fetching games from odds API: {str(e)}")
            return []
    
    def get_odds_for_game(
        self, 
        home_team: str, 
        away_team: str, 
        league: League
    ) -> Dict[str, float]:
        """
        Fetch current odds for a specific game.
        
        Args:
            home_team: Home team name
            away_team: Away team name
            league: Sports league
            
        Returns:
            Dictionary of odds by market type
        """
        try:
            # Mock odds data
            return self._get_mock_odds(home_team, away_team, league)
            
        except Exception as e:
            logger.error(f"Error fetching odds for {away_team} @ {home_team}: {str(e)}")
            return {}
    
    def get_odds_movement(
        self, 
        home_team: str, 
        away_team: str, 
        hours_back: int = 24
    ) -> Dict[str, List[Tuple[datetime, float]]]:
        """
        Fetch historical odds movement for a game.
        
        Args:
            home_team: Home team name
            away_team: Away team name
            hours_back: How many hours of history to fetch
            
        Returns:
            Dictionary of odds history by market
        """
        try:
            # Mock odds movement data
            return self._get_mock_odds_movement(home_team, away_team, hours_back)
            
        except Exception as e:
            logger.error(f"Error fetching odds movement: {str(e)}")
            return {}
    
    def _get_mock_games(
        self, 
        target_date: date, 
        leagues: Optional[List[League]] = None
    ) -> List[Game]:
        """Return mock game data for testing."""
        mock_games = [
            Game(
                home_team="Kansas City Chiefs",
                away_team="Buffalo Bills",
                league=League.NFL,
                start_time=datetime.combine(target_date, datetime.min.time().replace(hour=20)),
                odds={
                    "home_ml": -120,
                    "away_ml": +100,
                    "home_spread": -2.5,
                    "away_spread": +2.5,
                    "total_over": 47.5,
                    "total_under": 47.5
                },
                venue="Arrowhead Stadium",
                weather={
                    "temperature": 45,
                    "wind_speed": 8,
                    "precipitation": 0.0,
                    "conditions": "Clear"
                }
            ),
            Game(
                home_team="Los Angeles Lakers",
                away_team="Boston Celtics",
                league=League.NBA,
                start_time=datetime.combine(target_date, datetime.min.time().replace(hour=22)),
                odds={
                    "home_ml": -110,
                    "away_ml": -110,
                    "home_spread": -1.5,
                    "away_spread": +1.5,
                    "total_over": 225.5,
                    "total_under": 225.5
                },
                venue="Crypto.com Arena"
            )
        ]
        
        # Filter by leagues if specified
        if leagues:
            mock_games = [game for game in mock_games if game.league in leagues]
        
        return mock_games
    
    def _get_mock_odds(
        self, 
        home_team: str, 
        away_team: str, 
        league: League
    ) -> Dict[str, float]:
        """Return mock odds data."""
        if league == League.NFL:
            return {
                "home_ml": -115,
                "away_ml": -105,
                "home_spread": -3.0,
                "away_spread": +3.0,
                "total_over": 45.5,
                "total_under": 45.5
            }
        elif league == League.NBA:
            return {
                "home_ml": -120,
                "away_ml": +100,
                "home_spread": -2.5,
                "away_spread": +2.5,
                "total_over": 220.5,
                "total_under": 220.5
            }
        else:
            return {
                "home_ml": -110,
                "away_ml": -110
            }
    
    def _get_mock_odds_movement(
        self, 
        home_team: str, 
        away_team: str, 
        hours_back: int
    ) -> Dict[str, List[Tuple[datetime, float]]]:
        """Return mock odds movement data."""
        now = datetime.utcnow()
        return {
            "home_ml": [
                (now.replace(hour=now.hour-2), -110),
                (now.replace(hour=now.hour-1), -115),
                (now, -120)
            ],
            "away_ml": [
                (now.replace(hour=now.hour-2), -110),
                (now.replace(hour=now.hour-1), -105),
                (now, +100)
            ]
        }


class WeatherAPI:
    """Interface to weather data providers (OpenWeatherMap, etc.)."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize weather API client."""
        self.api_key = api_key or os.getenv('WEATHER_API_KEY')
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.timeout = 5
    
    def get_weather_for_venue(
        self, 
        venue: str, 
        game_time: datetime
    ) -> Dict[str, Any]:
        """
        Fetch weather conditions for a specific venue and time.
        
        Args:
            venue: Stadium/venue name or location
            game_time: When the game is scheduled
            
        Returns:
            Weather data dictionary
        """
        try:
            # For now, return mock weather data
            return self._get_mock_weather(venue, game_time)
            
        except Exception as e:
            logger.error(f"Error fetching weather for {venue}: {str(e)}")
            return {}
    
    def get_weather_by_coordinates(
        self, 
        lat: float, 
        lon: float, 
        game_time: datetime
    ) -> Dict[str, Any]:
        """
        Fetch weather by geographic coordinates.
        
        Args:
            lat: Latitude
            lon: Longitude
            game_time: When the game is scheduled
            
        Returns:
            Weather data dictionary
        """
        try:
            return self._get_mock_weather_by_coords(lat, lon, game_time)
            
        except Exception as e:
            logger.error(f"Error fetching weather for coordinates {lat}, {lon}: {str(e)}")
            return {}
    
    def _get_mock_weather(self, venue: str, game_time: datetime) -> Dict[str, Any]:
        """Return mock weather data for testing."""
        # Different weather based on venue
        if "Green Bay" in venue or "Buffalo" in venue or "Chicago" in venue:
            # Cold weather venues
            return {
                "temperature": 28,
                "feels_like": 22,
                "humidity": 65,
                "wind_speed": 12,
                "wind_direction": 270,
                "precipitation": 0.0,
                "conditions": "Partly Cloudy",
                "visibility": 10,
                "pressure": 30.15
            }
        elif "Miami" in venue or "Tampa" in venue or "Phoenix" in venue:
            # Warm weather venues
            return {
                "temperature": 78,
                "feels_like": 82,
                "humidity": 75,
                "wind_speed": 6,
                "wind_direction": 180,
                "precipitation": 0.0,
                "conditions": "Sunny",
                "visibility": 10,
                "pressure": 29.92
            }
        else:
            # Default moderate weather
            return {
                "temperature": 55,
                "feels_like": 52,
                "humidity": 60,
                "wind_speed": 8,
                "wind_direction": 225,
                "precipitation": 0.0,
                "conditions": "Clear",
                "visibility": 10,
                "pressure": 30.05
            }
    
    def _get_mock_weather_by_coords(
        self, 
        lat: float, 
        lon: float, 
        game_time: datetime
    ) -> Dict[str, Any]:
        """Return mock weather data by coordinates."""
        return {
            "temperature": 62,
            "feels_like": 58,
            "humidity": 55,
            "wind_speed": 7,
            "wind_direction": 200,
            "precipitation": 0.0,
            "conditions": "Clear",
            "visibility": 10,
            "pressure": 30.00
        }


class SportsDataAPI:
    """Interface to SportsData.io for comprehensive sports statistics."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize SportsData.io API client."""
        self.api_key = api_key or os.getenv('SPORTS_DATA_API_KEY')
        
        # SportsData.io endpoints by sport
        self.base_urls = {
            League.NFL: "https://api.sportsdata.io/v3/nfl",
            League.NBA: "https://api.sportsdata.io/v3/nba", 
            League.MLB: "https://api.sportsdata.io/v3/mlb",
            League.NHL: "https://api.sportsdata.io/v3/nhl"
        }
        
        # ESPN as fallback (free)
        self.espn_base_url = "https://site.api.espn.com/apis/site/v2/sports"
        
        self.timeout = 10
        self.rate_limiter = APIRateLimiter(calls_per_minute=30)  # Conservative for free tier
    
    def get_team_stats(
        self, 
        team_name: str, 
        league: League, 
        season: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch comprehensive team statistics from SportsData.io.
        
        Args:
            team_name: Team name
            league: Sports league
            season: Optional season identifier (defaults to current)
            
        Returns:
            Team statistics dictionary with advanced metrics
        """
        try:
            # Try SportsData.io first (most comprehensive)
            if self.api_key:
                sportsdata_stats = self._get_sportsdata_team_stats(team_name, league, season)
                if sportsdata_stats:
                    return sportsdata_stats
            
            # Fallback to ESPN API (free but less detailed)
            espn_stats = self._get_espn_team_stats(team_name, league, season)
            if espn_stats:
                return espn_stats
            
            # Final fallback to enhanced mock data
            return self._get_enhanced_mock_team_stats(team_name, league)
            
        except Exception as e:
            logger.error(f"Error fetching team stats for {team_name}: {str(e)}")
            return self._get_enhanced_mock_team_stats(team_name, league)
    
    def get_injury_report(
        self, 
        team_name: str, 
        league: League
    ) -> List[Dict[str, Any]]:
        """
        Fetch current injury report from SportsData.io.
        
        Args:
            team_name: Team name
            league: Sports league
            
        Returns:
            List of injury reports with position-specific impact analysis
        """
        try:
            # Try SportsData.io first (most comprehensive)
            if self.api_key:
                sportsdata_injuries = self._get_sportsdata_injuries(team_name, league)
                if sportsdata_injuries:
                    return sportsdata_injuries
            
            # Fallback to ESPN API
            espn_injuries = self._get_espn_injuries(team_name, league)
            if espn_injuries:
                return espn_injuries
            
            # Final fallback to enhanced mock data
            return self._get_enhanced_mock_injuries(team_name, league)
            
        except Exception as e:
            logger.error(f"Error fetching injuries for {team_name}: {str(e)}")
            return self._get_enhanced_mock_injuries(team_name, league)
    
    def _get_sportsdata_injuries(
        self, 
        team_name: str, 
        league: League
    ) -> Optional[List[Dict[str, Any]]]:
        """Fetch injury reports from SportsData.io."""
        try:
            if not requests or not self.api_key:
                return None
            
            self.rate_limiter.wait_if_needed()
            
            base_url = self.base_urls.get(league)
            if not base_url:
                return None
            
            # Get current season
            current_season = self._get_current_season(league)
            
            # SportsData.io injury endpoint
            url = f"{base_url}/scores/json/Injuries/{current_season}"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                team_injuries = self._filter_team_injuries(data, team_name)
                return self._parse_sportsdata_injuries(team_injuries, league)
            
            return None
            
        except Exception as e:
            logger.warning(f"SportsData.io injury error: {str(e)}")
            return None
    
    def _filter_team_injuries(
        self, 
        injuries_data: List[Dict[str, Any]], 
        team_name: str
    ) -> List[Dict[str, Any]]:
        """Filter injuries for specific team."""
        try:
            team_name_lower = team_name.lower()
            team_injuries = []
            
            for injury in injuries_data:
                team_info = injury.get('Team', '')
                if team_name_lower in team_info.lower():
                    team_injuries.append(injury)
            
            return team_injuries
            
        except Exception:
            return []
    
    def _parse_sportsdata_injuries(
        self, 
        injuries_data: List[Dict[str, Any]], 
        league: League
    ) -> List[Dict[str, Any]]:
        """Parse SportsData.io injury data into our format."""
        parsed_injuries = []
        
        try:
            for injury in injuries_data:
                # Map SportsData.io status to our format
                status_map = {
                    'Out': 'Out',
                    'Doubtful': 'Doubtful', 
                    'Questionable': 'Questionable',
                    'Probable': 'Probable',
                    'Day To Day': 'Questionable',
                    'IR': 'Out'
                }
                
                status = status_map.get(injury.get('Status', ''), 'Questionable')
                position = injury.get('Position', 'Unknown')
                
                parsed_injury = {
                    "player": injury.get('Name', 'Unknown Player'),
                    "position": position,
                    "status": status,
                    "injury": injury.get('BodyPart', 'Unknown'),
                    "impact": self._calculate_injury_impact(position, status, league),
                    "games_missed": injury.get('GamesMissed', 0),
                    "expected_return": injury.get('ExpectedReturn', 'Unknown'),
                    "updated": injury.get('Updated', datetime.utcnow().isoformat())
                }
                
                parsed_injuries.append(parsed_injury)
            
        except Exception as e:
            logger.warning(f"Error parsing injury data: {str(e)}")
        
        return parsed_injuries
    
    def get_recent_games(
        self, 
        team_name: str, 
        league: League, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent game results from SportsData.io.
        
        Args:
            team_name: Team name
            league: Sports league
            limit: Number of recent games to fetch
            
        Returns:
            List of recent games with results and opponent ratings
        """
        try:
            # Try SportsData.io first
            if self.api_key:
                sportsdata_games = self._get_sportsdata_recent_games(team_name, league, limit)
                if sportsdata_games:
                    return sportsdata_games
            
            # Fallback to ESPN
            espn_games = self._get_espn_recent_games(team_name, league, limit)
            if espn_games:
                return espn_games
            
            # Final fallback to mock data
            return self._get_mock_recent_games(team_name, league, limit)
            
        except Exception as e:
            logger.error(f"Error fetching recent games for {team_name}: {str(e)}")
            return self._get_mock_recent_games(team_name, league, limit)
    
    def _get_sportsdata_recent_games(
        self, 
        team_name: str, 
        league: League, 
        limit: int
    ) -> Optional[List[Dict[str, Any]]]:
        """Fetch recent games from SportsData.io."""
        try:
            if not requests or not self.api_key:
                return None
            
            self.rate_limiter.wait_if_needed()
            
            base_url = self.base_urls.get(league)
            if not base_url:
                return None
            
            current_season = self._get_current_season(league)
            
            # Get team schedule/scores
            url = f"{base_url}/scores/json/Scores/{current_season}"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                team_games = self._filter_team_games(data, team_name, limit)
                return self._parse_sportsdata_games(team_games, team_name)
            
            return None
            
        except Exception as e:
            logger.warning(f"SportsData.io games error: {str(e)}")
            return None
    
    def _filter_team_games(
        self, 
        games_data: List[Dict[str, Any]], 
        team_name: str, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Filter and sort games for specific team."""
        try:
            team_name_lower = team_name.lower()
            team_games = []
            
            for game in games_data:
                # Check if team is home or away
                home_team = game.get('HomeTeam', '')
                away_team = game.get('AwayTeam', '')
                
                if (team_name_lower in home_team.lower() or 
                    team_name_lower in away_team.lower()):
                    
                    # Only include completed games
                    if game.get('Status') == 'Final':
                        team_games.append(game)
            
            # Sort by date (most recent first) and limit
            team_games.sort(key=lambda x: x.get('Date', ''), reverse=True)
            return team_games[:limit]
            
        except Exception:
            return []
    
    def _parse_sportsdata_games(
        self, 
        games_data: List[Dict[str, Any]], 
        team_name: str
    ) -> List[Dict[str, Any]]:
        """Parse SportsData.io games into our format."""
        parsed_games = []
        
        try:
            team_name_lower = team_name.lower()
            
            for game in games_data:
                home_team = game.get('HomeTeam', '')
                away_team = game.get('AwayTeam', '')
                home_score = game.get('HomeScore', 0)
                away_score = game.get('AwayScore', 0)
                
                # Determine if team was home or away
                is_home = team_name_lower in home_team.lower()
                
                if is_home:
                    team_score = home_score
                    opponent_score = away_score
                    opponent = away_team
                    home_away = "Home"
                else:
                    team_score = away_score
                    opponent_score = home_score
                    opponent = home_team
                    home_away = "Away"
                
                # Determine result
                if team_score > opponent_score:
                    result = "W"
                elif team_score < opponent_score:
                    result = "L"
                else:
                    result = "T"  # Tie (rare in most sports)
                
                parsed_game = {
                    "date": game.get('Date', ''),
                    "opponent": opponent,
                    "result": result,
                    "score_for": team_score,
                    "score_against": opponent_score,
                    "home_away": home_away,
                    "opponent_rating": self._estimate_opponent_rating(opponent),
                    "margin": team_score - opponent_score,
                    "game_id": game.get('GameID', '')
                }
                
                parsed_games.append(parsed_game)
            
        except Exception as e:
            logger.warning(f"Error parsing games data: {str(e)}")
        
        return parsed_games
    
    def _estimate_opponent_rating(self, opponent_name: str) -> float:
        """Estimate opponent rating (would be enhanced with actual data)."""
        # This would ideally use actual team ratings
        # For now, use a hash-based estimate for consistency
        opponent_hash = hash(opponent_name) % 100
        return 95.0 + (opponent_hash / 100.0) * 20.0  # 95-115 range
    
    def get_advanced_team_metrics(
        self, 
        team_name: str, 
        league: League
    ) -> Dict[str, float]:
        """
        Fetch advanced team metrics like efficiency ratings.
        
        Args:
            team_name: Team name
            league: Sports league
            
        Returns:
            Dictionary of advanced metrics
        """
        try:
            # This would integrate with advanced stats providers
            # For now, calculate from basic stats
            basic_stats = self.get_team_stats(team_name, league)
            return self._calculate_advanced_metrics(basic_stats, league)
        except Exception as e:
            logger.error(f"Error calculating advanced metrics for {team_name}: {str(e)}")
            return self._get_default_advanced_metrics()
    
    def _get_espn_team_stats(
        self, 
        team_name: str, 
        league: League, 
        season: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch team stats from ESPN API."""
        try:
            if not requests:
                return None
            
            self.rate_limiter.wait_if_needed()
            
            # Map league to ESPN sport
            sport_map = {
                League.NFL: "football/nfl",
                League.NBA: "basketball/nba",
                League.MLB: "baseball/mlb",
                League.NHL: "hockey/nhl"
            }
            
            sport = sport_map.get(league)
            if not sport:
                return None
            
            # Get team standings/stats
            url = f"{self.espn_base_url}/{sport}/standings"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_espn_team_data(data, team_name, league)
            
            return None
            
        except Exception as e:
            logger.warning(f"ESPN API error: {str(e)}")
            return None
    
    def _get_sportsdata_team_stats(
        self, 
        team_name: str, 
        league: League,
        season: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch comprehensive team stats from SportsData.io."""
        try:
            if not requests or not self.api_key:
                return None
            
            self.rate_limiter.wait_if_needed()
            
            base_url = self.base_urls.get(league)
            if not base_url:
                return None
            
            # Determine current season
            current_season = season or self._get_current_season(league)
            
            # Get team standings/stats
            url = f"{base_url}/scores/json/Standings/{current_season}"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                team_data = self._find_team_in_standings(data, team_name)
                
                if team_data:
                    # Get additional advanced stats
                    advanced_stats = self._get_sportsdata_advanced_stats(
                        team_data.get('TeamID'), league, current_season
                    )
                    
                    # Combine basic and advanced stats
                    return self._parse_sportsdata_team_data(team_data, advanced_stats, league)
            
            return None
            
        except Exception as e:
            logger.warning(f"SportsData.io error: {str(e)}")
            return None
    
    def _get_sportsdata_advanced_stats(
        self, 
        team_id: Optional[int], 
        league: League, 
        season: str
    ) -> Optional[Dict[str, Any]]:
        """Get advanced team statistics from SportsData.io."""
        try:
            if not team_id or not self.api_key:
                return None
            
            base_url = self.base_urls.get(league)
            if not base_url:
                return None
            
            # Different endpoints for different leagues
            if league == League.NFL:
                url = f"{base_url}/scores/json/TeamSeasonStats/{season}"
            elif league == League.NBA:
                url = f"{base_url}/scores/json/TeamSeasonStats/{season}"
            else:
                return None  # Add other leagues as needed
            
            params = {'key': self.api_key}
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                # Find team in the stats data
                for team_stats in data:
                    if team_stats.get('TeamID') == team_id:
                        return team_stats
            
            return None
            
        except Exception as e:
            logger.warning(f"Error fetching advanced stats: {str(e)}")
            return None
    
    def _get_current_season(self, league: League) -> str:
        """Get current season identifier for the league."""
        current_year = datetime.now().year
        
        if league == League.NFL:
            # NFL season runs Aug-Feb, so if it's Jan-July, use previous year
            if datetime.now().month <= 7:
                return str(current_year - 1)
            return str(current_year)
        elif league == League.NBA:
            # NBA season runs Oct-June
            if datetime.now().month <= 6:
                return f"{current_year-1}{current_year}"
            return f"{current_year}{current_year+1}"
        elif league == League.MLB:
            # MLB season runs Mar-Oct
            return str(current_year)
        elif league == League.NHL:
            # NHL season runs Oct-June
            if datetime.now().month <= 6:
                return f"{current_year-1}{current_year}"
            return f"{current_year}{current_year+1}"
        
        return str(current_year)
    
    def _find_team_in_standings(
        self, 
        standings_data: List[Dict[str, Any]], 
        team_name: str
    ) -> Optional[Dict[str, Any]]:
        """Find team data in standings response."""
        try:
            team_name_lower = team_name.lower()
            
            for team in standings_data:
                # Check various name fields
                names_to_check = [
                    team.get('Name', ''),
                    team.get('City', ''),
                    team.get('Key', ''),
                    f"{team.get('City', '')} {team.get('Name', '')}"
                ]
                
                for name in names_to_check:
                    if name and team_name_lower in name.lower():
                        return team
            
            return None
            
        except Exception:
            return None
    
    def _parse_sportsdata_team_data(
        self, 
        basic_data: Dict[str, Any], 
        advanced_data: Optional[Dict[str, Any]], 
        league: League
    ) -> Dict[str, Any]:
        """Parse SportsData.io response into our standardized format."""
        try:
            # Basic stats from standings
            wins = basic_data.get('Wins', 0)
            losses = basic_data.get('Losses', 0)
            total_games = wins + losses
            
            result = {
                "team_name": f"{basic_data.get('City', '')} {basic_data.get('Name', '')}".strip(),
                "wins": wins,
                "losses": losses,
                "win_percentage": wins / total_games if total_games > 0 else 0.5,
                "home_record": f"{basic_data.get('HomeWins', 0)}-{basic_data.get('HomeLosses', 0)}",
                "away_record": f"{basic_data.get('AwayWins', 0)}-{basic_data.get('AwayLosses', 0)}",
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Add league-specific stats
            if league == League.NFL:
                result.update({
                    "points_per_game": basic_data.get('PointsFor', 0) / max(1, total_games),
                    "points_allowed_per_game": basic_data.get('PointsAgainst', 0) / max(1, total_games),
                    "point_differential": basic_data.get('PointsDifferential', 0),
                    "division_wins": basic_data.get('DivisionWins', 0),
                    "division_losses": basic_data.get('DivisionLosses', 0)
                })
            elif league == League.NBA:
                result.update({
                    "points_per_game": basic_data.get('PointsPerGame', 0),
                    "points_allowed_per_game": basic_data.get('OpponentPointsPerGame', 0),
                    "field_goal_percentage": basic_data.get('FieldGoalPercentage', 0),
                    "three_point_percentage": basic_data.get('ThreePointPercentage', 0)
                })
            
            # Add advanced stats if available
            if advanced_data:
                result.update(self._parse_advanced_stats(advanced_data, league))
            
            # Calculate derived metrics
            result.update(self._calculate_derived_metrics(result, league))
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing SportsData.io team data: {str(e)}")
            return self._get_enhanced_mock_team_stats(
                basic_data.get('Name', 'Unknown Team'), league
            )
    
    def _parse_advanced_stats(
        self, 
        advanced_data: Dict[str, Any], 
        league: League
    ) -> Dict[str, Any]:
        """Parse advanced statistics from SportsData.io."""
        stats = {}
        
        try:
            if league == League.NFL:
                stats.update({
                    "total_yards_per_game": advanced_data.get('TotalYards', 0) / max(1, advanced_data.get('Games', 1)),
                    "yards_allowed_per_game": advanced_data.get('TotalYardsAllowed', 0) / max(1, advanced_data.get('Games', 1)),
                    "passing_yards_per_game": advanced_data.get('PassingYards', 0) / max(1, advanced_data.get('Games', 1)),
                    "rushing_yards_per_game": advanced_data.get('RushingYards', 0) / max(1, advanced_data.get('Games', 1)),
                    "turnovers": advanced_data.get('Turnovers', 0),
                    "takeaways": advanced_data.get('Takeaways', 0),
                    "turnover_differential": advanced_data.get('TurnoverDifferential', 0),
                    "red_zone_percentage": advanced_data.get('RedZonePercentage', 0),
                    "third_down_percentage": advanced_data.get('ThirdDownPercentage', 0)
                })
            elif league == League.NBA:
                stats.update({
                    "offensive_rebounds_per_game": advanced_data.get('OffensiveRebounds', 0) / max(1, advanced_data.get('Games', 1)),
                    "defensive_rebounds_per_game": advanced_data.get('DefensiveRebounds', 0) / max(1, advanced_data.get('Games', 1)),
                    "assists_per_game": advanced_data.get('Assists', 0) / max(1, advanced_data.get('Games', 1)),
                    "steals_per_game": advanced_data.get('Steals', 0) / max(1, advanced_data.get('Games', 1)),
                    "blocks_per_game": advanced_data.get('Blocks', 0) / max(1, advanced_data.get('Games', 1)),
                    "turnovers_per_game": advanced_data.get('Turnovers', 0) / max(1, advanced_data.get('Games', 1))
                })
            
        except Exception as e:
            logger.warning(f"Error parsing advanced stats: {str(e)}")
        
        return stats
    
    def _calculate_derived_metrics(
        self, 
        team_data: Dict[str, Any], 
        league: League
    ) -> Dict[str, Any]:
        """Calculate derived efficiency metrics."""
        metrics = {}
        
        try:
            ppg = team_data.get('points_per_game', 25.0)
            pag = team_data.get('points_allowed_per_game', 25.0)
            
            # Basic efficiency ratings (normalized to 100)
            league_avg_ppg = self._get_league_average_ppg(league)
            
            metrics.update({
                "offensive_rating": (ppg / league_avg_ppg) * 100,
                "defensive_rating": (league_avg_ppg / pag) * 100 if pag > 0 else 100,
                "net_rating": ppg - pag,
                "pace": 100.0,  # Would need possession data for accurate pace
                "strength_of_schedule": 0.5  # Would need opponent data
            })
            
            metrics["net_rating_normalized"] = metrics["offensive_rating"] - (200 - metrics["defensive_rating"])
            
        except Exception as e:
            logger.warning(f"Error calculating derived metrics: {str(e)}")
            metrics = {
                "offensive_rating": 100.0,
                "defensive_rating": 100.0,
                "net_rating": 0.0,
                "pace": 100.0,
                "strength_of_schedule": 0.5
            }
        
        return metrics
    
    def _get_league_average_ppg(self, league: League) -> float:
        """Get typical league average points per game."""
        averages = {
            League.NFL: 22.0,
            League.NBA: 112.0,
            League.MLB: 4.5,
            League.NHL: 3.0
        }
        return averages.get(league, 25.0)
    
    def _parse_espn_team_data(
        self, 
        data: Dict[str, Any], 
        team_name: str, 
        league: League
    ) -> Dict[str, Any]:
        """Parse ESPN API response into our format."""
        try:
            # This would parse the actual ESPN response
            # For now, return enhanced mock data based on team name
            return self._get_enhanced_mock_team_stats(team_name, league)
        except Exception:
            return self._get_enhanced_mock_team_stats(team_name, league)
    

    
    def _get_enhanced_mock_team_stats(self, team_name: str, league: League) -> Dict[str, Any]:
        """Return enhanced mock team statistics with realistic variance."""
        # Create realistic stats based on team name hash for consistency
        team_hash = hash(team_name) % 1000
        base_strength = (team_hash % 100) / 100.0  # 0.0 to 1.0
        
        # Adjust for "good" vs "bad" team names
        strength_modifiers = {
            'chiefs': 0.8, 'patriots': 0.7, 'packers': 0.75, 'steelers': 0.7,
            'cowboys': 0.6, 'giants': 0.4, 'jets': 0.3, 'browns': 0.35,
            'lakers': 0.8, 'celtics': 0.75, 'warriors': 0.7, 'heat': 0.65,
            'knicks': 0.4, 'pistons': 0.3, 'magic': 0.35
        }
        
        for keyword, modifier in strength_modifiers.items():
            if keyword in team_name.lower():
                base_strength = modifier
                break
        
        # Generate realistic stats
        wins = int(12 * base_strength + 2)  # 2-14 wins
        losses = 17 - wins if league == League.NFL else 82 - wins
        
        return {
            "team_name": team_name,
            "wins": wins,
            "losses": losses,
            "win_percentage": wins / (wins + losses),
            "points_per_game": 20.0 + (base_strength * 15),  # 20-35 PPG
            "points_allowed_per_game": 35.0 - (base_strength * 15),  # 20-35 PAG
            "home_record": f"{int(wins * 0.6)}-{int(losses * 0.4)}",
            "away_record": f"{int(wins * 0.4)}-{int(losses * 0.6)}",
            "recent_form": self._generate_realistic_form(base_strength),
            "strength_of_schedule": 0.45 + (team_hash % 20) / 100.0,  # 0.45-0.65
            
            # Advanced metrics
            "offensive_rating": 95.0 + (base_strength * 20),  # 95-115
            "defensive_rating": 115.0 - (base_strength * 20),  # 95-115
            "pace": 95.0 + (team_hash % 20),  # 95-115
            "net_rating": (95.0 + base_strength * 20) - (115.0 - base_strength * 20),
            
            # Situational stats
            "home_offensive_rating": 95.0 + (base_strength * 22),  # Home advantage
            "away_offensive_rating": 95.0 + (base_strength * 18),
            "home_defensive_rating": 115.0 - (base_strength * 22),
            "away_defensive_rating": 115.0 - (base_strength * 18),
            
            # Quality metrics
            "record_vs_quality": f"{int(wins * 0.3)}-{int(losses * 0.7)}",
            "sos_past": 0.45 + (team_hash % 30) / 100.0,
            "sos_future": 0.45 + ((team_hash + 100) % 30) / 100.0,
            
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def _generate_realistic_form(self, base_strength: float) -> List[str]:
        """Generate realistic recent form based on team strength."""
        form = []
        for i in range(10):  # Last 10 games
            # Good teams win more, bad teams lose more, with some randomness
            win_prob = base_strength + (hash(f"form_{i}") % 100) / 500.0  # Add randomness
            win_prob = max(0.1, min(0.9, win_prob))  # Clamp between 10% and 90%
            
            form.append("W" if hash(f"game_{i}") % 100 < win_prob * 100 else "L")
        
        return form
    
    def _get_enhanced_mock_injuries(self, team_name: str, league: League) -> List[Dict[str, Any]]:
        """Return enhanced mock injury data with position-specific impacts."""
        team_hash = hash(team_name) % 100
        
        # Some teams have more injuries than others
        injury_count = (team_hash % 4) + 1  # 1-4 injuries
        
        injuries = []
        positions = {
            League.NFL: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K"],
            League.NBA: ["PG", "SG", "SF", "PF", "C"],
            League.MLB: ["P", "C", "1B", "2B", "3B", "SS", "OF"],
            League.NHL: ["C", "LW", "RW", "D", "G"]
        }
        
        statuses = ["Out", "Doubtful", "Questionable", "Probable"]
        injury_types = ["Ankle", "Knee", "Shoulder", "Hamstring", "Back", "Concussion", "Wrist"]
        
        for i in range(injury_count):
            pos_list = positions.get(league, positions[League.NFL])
            position = pos_list[(team_hash + i) % len(pos_list)]
            status = statuses[(team_hash + i) % len(statuses)]
            injury_type = injury_types[(team_hash + i) % len(injury_types)]
            
            # Calculate impact based on position and status
            impact = self._calculate_injury_impact(position, status, league)
            
            injuries.append({
                "player": f"Player {i+1}",
                "position": position,
                "status": status,
                "injury": injury_type,
                "impact": impact,
                "games_missed": (team_hash + i) % 5,
                "expected_return": "1-2 weeks" if status != "Out" else "3-4 weeks"
            })
        
        return injuries
    
    def _calculate_injury_impact(self, position: str, status: str, league: League) -> str:
        """Calculate injury impact based on position importance and status."""
        # Position importance by league
        high_impact_positions = {
            League.NFL: ["QB", "RB", "WR"],
            League.NBA: ["PG", "C"],
            League.MLB: ["P", "C"],
            League.NHL: ["C", "G"]
        }
        
        medium_impact_positions = {
            League.NFL: ["TE", "OL", "DL", "LB"],
            League.NBA: ["SG", "SF", "PF"],
            League.MLB: ["1B", "SS", "OF"],
            League.NHL: ["LW", "RW", "D"]
        }
        
        # Determine base impact
        if position in high_impact_positions.get(league, []):
            base_impact = "High"
        elif position in medium_impact_positions.get(league, []):
            base_impact = "Medium"
        else:
            base_impact = "Low"
        
        # Adjust for status
        if status == "Probable":
            return "Low"
        elif status == "Questionable" and base_impact == "High":
            return "Medium"
        elif status == "Out":
            return "High" if base_impact in ["High", "Medium"] else "Medium"
        
        return base_impact
    
    def _calculate_advanced_metrics(
        self, 
        basic_stats: Dict[str, Any], 
        league: League
    ) -> Dict[str, float]:
        """Calculate advanced metrics from basic stats."""
        try:
            ppg = basic_stats.get('points_per_game', 25.0)
            pag = basic_stats.get('points_allowed_per_game', 25.0)
            
            # Calculate efficiency ratings (normalized to 100)
            offensive_rating = basic_stats.get('offensive_rating', ppg * 4)  # Rough conversion
            defensive_rating = basic_stats.get('defensive_rating', pag * 4)
            
            return {
                'offensive_rating': offensive_rating,
                'defensive_rating': defensive_rating,
                'net_rating': offensive_rating - defensive_rating,
                'pace': basic_stats.get('pace', 100.0),
                'true_shooting_pct': 0.55 + (offensive_rating - 100) / 100,  # Estimated
                'effective_fg_pct': 0.50 + (offensive_rating - 100) / 120,
                'turnover_rate': max(0.08, 0.15 - (offensive_rating - 100) / 200),
                'offensive_rebound_pct': 0.25 + (offensive_rating - 100) / 400,
                'defensive_rebound_pct': 0.75 + (100 - defensive_rating) / 400
            }
        except Exception:
            return self._get_default_advanced_metrics()
    
    def _get_default_advanced_metrics(self) -> Dict[str, float]:
        """Return default advanced metrics."""
        return {
            'offensive_rating': 100.0,
            'defensive_rating': 100.0,
            'net_rating': 0.0,
            'pace': 100.0,
            'true_shooting_pct': 0.55,
            'effective_fg_pct': 0.50,
            'turnover_rate': 0.12,
            'offensive_rebound_pct': 0.25,
            'defensive_rebound_pct': 0.75
        }
    
    def _get_espn_recent_games(
        self, 
        team_name: str, 
        league: League, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch recent games from ESPN API."""
        # This would make actual ESPN API calls
        # For now, return mock data
        return self._get_mock_recent_games(team_name, league, limit)
    
    def _get_mock_recent_games(
        self, 
        team_name: str, 
        league: League, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Generate mock recent games with opponent ratings."""
        games = []
        team_hash = hash(team_name)
        
        for i in range(limit):
            game_hash = team_hash + i
            opponent_strength = (game_hash % 100) / 100.0
            team_strength = (team_hash % 100) / 100.0
            
            # Determine result based on relative strength
            win_prob = 0.5 + (team_strength - opponent_strength) * 0.3
            result = "W" if (game_hash % 100) < win_prob * 100 else "L"
            
            games.append({
                "date": (datetime.now() - timedelta(days=i*3)).strftime("%Y-%m-%d"),
                "opponent": f"Opponent {i+1}",
                "result": result,
                "score_for": int(20 + team_strength * 15 + (game_hash % 10)),
                "score_against": int(20 + opponent_strength * 15 + ((game_hash + 50) % 10)),
                "home_away": "Home" if i % 2 == 0 else "Away",
                "opponent_rating": 95.0 + opponent_strength * 20,  # 95-115 rating
                "margin": int((team_strength - opponent_strength) * 10 + (game_hash % 6) - 3)
            })
        
        return games
    
    def _get_mock_team_stats(self, team_name: str, league: League) -> Dict[str, Any]:
        """Return mock team statistics with advanced metrics."""
        import random
        
        # Generate realistic but varied stats
        base_rating = random.uniform(95, 115)
        
        return {
            "wins": random.randint(6, 10),
            "losses": random.randint(2, 6),
            "win_percentage": random.uniform(0.4, 0.8),
            "points_per_game": random.uniform(20, 30),
            "points_allowed_per_game": random.uniform(18, 28),
            "home_record": f"{random.randint(3, 6)}-{random.randint(0, 3)}",
            "away_record": f"{random.randint(2, 5)}-{random.randint(1, 4)}",
            "recent_form": [random.choice(["W", "L"]) for _ in range(10)],
            "strength_of_schedule": random.uniform(0.45, 0.65),
            
            # Advanced efficiency metrics
            "offensive_rating": base_rating + random.uniform(-10, 10),
            "defensive_rating": base_rating + random.uniform(-10, 10),
            "pace": random.uniform(95, 105),
            
            # Recent games with opponent context
            "recent_games": [
                {
                    "result": random.choice(["W", "L"]),
                    "opponent_rating": random.uniform(90, 120),
                    "days_ago": i + 1
                }
                for i in range(10)
            ],
            
            # Strength of schedule breakdown
            "sos_past": random.uniform(0.4, 0.7),
            "sos_future": random.uniform(0.4, 0.7),
            "record_vs_quality": f"{random.randint(2, 5)}-{random.randint(1, 4)}",
            
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def _get_mock_injuries(self, team_name: str, league: League) -> List[Dict[str, Any]]:
        """Return mock injury data with position-specific impacts."""
        import random
        
        injuries = []
        
        # Generate 0-3 injuries per team
        num_injuries = random.randint(0, 3)
        
        positions = {
            League.NFL: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S"],
            League.NBA: ["PG", "SG", "SF", "PF", "C"],
            League.MLB: ["P", "C", "1B", "2B", "3B", "SS", "OF"],
            League.NHL: ["G", "D", "LW", "RW", "C"]
        }
        
        statuses = ["Out", "Doubtful", "Questionable", "Probable"]
        injury_types = ["Ankle", "Knee", "Shoulder", "Hamstring", "Back", "Concussion"]
        
        for i in range(num_injuries):
            position = random.choice(positions.get(league, ["Player"]))
            status = random.choice(statuses)
            injury_type = random.choice(injury_types)
            
            # Determine impact based on position and league
            impact = "Low"
            if league == League.NFL and position == "QB":
                impact = "High"
            elif league == League.NBA and position in ["PG", "SG"]:
                impact = "Medium" if random.random() > 0.5 else "High"
            elif position in ["P"] and league == League.MLB:
                impact = "High"
            
            injuries.append({
                "player": f"{position} Player {i+1}",
                "position": position,
                "status": status,
                "injury": injury_type,
                "impact": impact
            })
        
        return injuries
    
    def get_team_schedule(
        self, 
        team_name: str, 
        league: League,
        days_back: int = 10,
        days_forward: int = 5
    ) -> Dict[str, Any]:
        """
        Fetch team schedule for rest/travel analysis.
        
        Args:
            team_name: Team name
            league: Sports league
            days_back: Days of past schedule to fetch
            days_forward: Days of future schedule to fetch
            
        Returns:
            Schedule data with rest and travel information
        """
        try:
            return self._get_mock_schedule(team_name, league, days_back, days_forward)
            
        except Exception as e:
            logger.error(f"Error fetching schedule for {team_name}: {str(e)}")
            return {}
    
    def get_venue_info(self, venue_name: str) -> Dict[str, Any]:
        """
        Fetch venue information including location, altitude, etc.
        
        Args:
            venue_name: Venue/stadium name
            
        Returns:
            Venue information dictionary
        """
        try:
            return self._get_mock_venue_info(venue_name)
            
        except Exception as e:
            logger.error(f"Error fetching venue info for {venue_name}: {str(e)}")
            return {}
    
    def _get_mock_schedule(
        self, 
        team_name: str, 
        league: League,
        days_back: int,
        days_forward: int
    ) -> Dict[str, Any]:
        """Return mock schedule data."""
        import random
        from datetime import timedelta
        
        now = datetime.utcnow()
        schedule = {
            "past_games": [],
            "upcoming_games": []
        }
        
        # Generate past games
        for i in range(days_back):
            game_date = now - timedelta(days=i+1)
            schedule["past_games"].append({
                "date": game_date.isoformat(),
                "opponent": f"Team {random.randint(1, 30)}",
                "home_away": random.choice(["home", "away"]),
                "result": random.choice(["W", "L"]),
                "travel_distance": random.randint(0, 2500) if random.choice(["home", "away"]) == "away" else 0
            })
        
        # Generate upcoming games
        for i in range(days_forward):
            game_date = now + timedelta(days=i+1)
            schedule["upcoming_games"].append({
                "date": game_date.isoformat(),
                "opponent": f"Team {random.randint(1, 30)}",
                "home_away": random.choice(["home", "away"]),
                "travel_distance": random.randint(0, 2500) if random.choice(["home", "away"]) == "away" else 0
            })
        
        return schedule
    
    def _get_mock_venue_info(self, venue_name: str) -> Dict[str, Any]:
        """Return mock venue information."""
        # Mock venue database
        venues = {
            "Arrowhead Stadium": {
                "city": "Kansas City",
                "state": "MO",
                "latitude": 39.0489,
                "longitude": -94.4839,
                "altitude": 750,  # feet
                "capacity": 76416,
                "surface": "Grass",
                "dome": False,
                "timezone": "America/Chicago"
            },
            "Crypto.com Arena": {
                "city": "Los Angeles",
                "state": "CA", 
                "latitude": 34.0430,
                "longitude": -118.2673,
                "altitude": 300,
                "capacity": 20000,
                "surface": "Hardwood",
                "dome": True,
                "timezone": "America/Los_Angeles"
            },
            "Lambeau Field": {
                "city": "Green Bay",
                "state": "WI",
                "latitude": 44.5013,
                "longitude": -88.0622,
                "altitude": 640,
                "capacity": 81441,
                "surface": "Grass",
                "dome": False,
                "timezone": "America/Chicago"
            }
        }
        
        return venues.get(venue_name, {
            "city": "Unknown",
            "state": "Unknown",
            "latitude": 40.0,
            "longitude": -95.0,
            "altitude": 500,
            "capacity": 50000,
            "surface": "Unknown",
            "dome": False,
            "timezone": "America/Chicago"
        })


class APIRateLimiter:
    """Simple rate limiter for external API calls."""
    
    def __init__(self, calls_per_minute: int = 60):
        """Initialize rate limiter."""
        self.calls_per_minute = calls_per_minute
        self.call_times = []
    
    def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = datetime.utcnow()
        
        # Remove calls older than 1 minute
        self.call_times = [
            call_time for call_time in self.call_times 
            if (now - call_time).total_seconds() < 60
        ]
        
        # Check if we need to wait
        if len(self.call_times) >= self.calls_per_minute:
            oldest_call = min(self.call_times)
            wait_time = 60 - (now - oldest_call).total_seconds()
            if wait_time > 0:
                import time
                time.sleep(wait_time)
        
        # Record this call
        self.call_times.append(now)