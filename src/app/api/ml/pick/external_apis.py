"""
External API integration stubs for odds and weather data.

This module provides interfaces to external data sources needed for
ML betting predictions, including odds providers and weather services.
"""

import os
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date
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

from .models import Game, League, ExternalAPIError


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
    """Interface to sports statistics and team data providers."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize sports data API client."""
        self.api_key = api_key or os.getenv('SPORTS_DATA_API_KEY')
        self.timeout = 10
    
    def get_team_stats(
        self, 
        team_name: str, 
        league: League, 
        season: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch team statistics and performance data.
        
        Args:
            team_name: Team name
            league: Sports league
            season: Optional season identifier
            
        Returns:
            Team statistics dictionary
        """
        try:
            return self._get_mock_team_stats(team_name, league)
            
        except Exception as e:
            logger.error(f"Error fetching team stats for {team_name}: {str(e)}")
            return {}
    
    def get_injury_report(
        self, 
        team_name: str, 
        league: League
    ) -> List[Dict[str, Any]]:
        """
        Fetch current injury report for a team.
        
        Args:
            team_name: Team name
            league: Sports league
            
        Returns:
            List of injury reports
        """
        try:
            return self._get_mock_injuries(team_name, league)
            
        except Exception as e:
            logger.error(f"Error fetching injuries for {team_name}: {str(e)}")
            return []
    
    def _get_mock_team_stats(self, team_name: str, league: League) -> Dict[str, Any]:
        """Return mock team statistics."""
        return {
            "wins": 8,
            "losses": 4,
            "win_percentage": 0.667,
            "points_per_game": 24.5,
            "points_allowed_per_game": 18.2,
            "home_record": "5-1",
            "away_record": "3-3",
            "recent_form": ["W", "W", "L", "W", "W"],
            "strength_of_schedule": 0.52,
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def _get_mock_injuries(self, team_name: str, league: League) -> List[Dict[str, Any]]:
        """Return mock injury data."""
        return [
            {
                "player": "Star Player",
                "position": "QB" if league == League.NFL else "PG",
                "status": "Questionable",
                "injury": "Ankle",
                "impact": "High"
            }
        ]


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