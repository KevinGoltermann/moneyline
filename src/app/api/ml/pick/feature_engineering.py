"""
Feature engineering pipeline for ML betting predictions.

This module processes raw game data, team statistics, and contextual information
to create feature vectors suitable for machine learning models.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

from .models import Game, FeatureVector, TeamStats


logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Feature engineering pipeline for betting predictions."""
    
    def __init__(self):
        """Initialize feature engineering pipeline."""
        self.feature_cache = {}
        self.team_stats_cache = {}
    
    def process_game_features(
        self, 
        game: Game, 
        team_stats: Optional[Dict[str, TeamStats]] = None,
        historical_data: Optional[Dict[str, Any]] = None
    ) -> FeatureVector:
        """
        Process a single game into feature vector.
        
        Args:
            game: Game data to process
            team_stats: Optional team statistics
            historical_data: Optional historical performance data
            
        Returns:
            FeatureVector: Processed features for ML model
        """
        try:
            # Extract basic odds features
            odds_features = self._extract_odds_features(game)
            
            # Calculate team performance features
            team_features = self._calculate_team_features(game, team_stats)
            
            # Add contextual features
            context_features = self._extract_contextual_features(game)
            
            # Combine all features
            feature_vector = FeatureVector(
                # Odds features
                odds_value=odds_features.get('primary_odds', 0.0),
                odds_movement=odds_features.get('movement', None),
                market_efficiency=odds_features.get('efficiency', None),
                
                # Team features
                home_win_rate=team_features.get('home_win_rate', 0.5),
                away_win_rate=team_features.get('away_win_rate', 0.5),
                head_to_head_record=team_features.get('h2h_record', None),
                recent_form_home=team_features.get('home_form', 0.5),
                recent_form_away=team_features.get('away_form', 0.5),
                
                # Context features
                rest_days_home=context_features.get('rest_home', None),
                rest_days_away=context_features.get('rest_away', None),
                travel_distance=context_features.get('travel', None),
                weather_impact=context_features.get('weather', None),
                
                # Advanced features (placeholders for now)
                strength_of_schedule=None,
                injury_impact=context_features.get('injury_impact', None),
                motivation_factor=None
            )
            
            return feature_vector
            
        except Exception as e:
            logger.error(f"Error processing game features: {str(e)}")
            # Return default feature vector on error
            return self._get_default_feature_vector()
    
    def _extract_odds_features(self, game: Game) -> Dict[str, float]:
        """Extract features from betting odds."""
        features = {}
        
        try:
            # Get moneyline odds
            home_ml = game.odds.get('home_ml', 0)
            away_ml = game.odds.get('away_ml', 0)
            
            if home_ml and away_ml:
                # Calculate implied probabilities
                home_prob = self._odds_to_probability(home_ml)
                away_prob = self._odds_to_probability(away_ml)
                
                # Primary odds (use home team odds as baseline)
                features['primary_odds'] = float(home_ml)
                
                # Market efficiency (total implied probability should be > 1.0)
                total_prob = home_prob + away_prob
                features['efficiency'] = total_prob if total_prob > 0 else 1.0
                
                # Odds movement (placeholder - would need historical data)
                features['movement'] = 0.0
            else:
                features['primary_odds'] = 0.0
                features['efficiency'] = 1.0
                features['movement'] = 0.0
                
        except Exception as e:
            logger.warning(f"Error extracting odds features: {str(e)}")
            features = {'primary_odds': 0.0, 'efficiency': 1.0, 'movement': 0.0}
        
        return features
    
    def _calculate_team_features(
        self, 
        game: Game, 
        team_stats: Optional[Dict[str, TeamStats]] = None
    ) -> Dict[str, float]:
        """Calculate team performance features."""
        features = {}
        
        try:
            if team_stats:
                home_stats = team_stats.get(game.home_team)
                away_stats = team_stats.get(game.away_team)
                
                # Win rates
                features['home_win_rate'] = (
                    home_stats.win_percentage if home_stats else 0.5
                )
                features['away_win_rate'] = (
                    away_stats.win_percentage if away_stats else 0.5
                )
                
                # Recent form
                features['home_form'] = (
                    self._calculate_recent_form(home_stats.recent_form) 
                    if home_stats and home_stats.recent_form else 0.5
                )
                features['away_form'] = (
                    self._calculate_recent_form(away_stats.recent_form)
                    if away_stats and away_stats.recent_form else 0.5
                )
                
                # Head-to-head (placeholder)
                features['h2h_record'] = 0.5
                
            else:
                # Default values when no team stats available
                features = {
                    'home_win_rate': 0.5,
                    'away_win_rate': 0.5,
                    'home_form': 0.5,
                    'away_form': 0.5,
                    'h2h_record': 0.5
                }
                
        except Exception as e:
            logger.warning(f"Error calculating team features: {str(e)}")
            features = {
                'home_win_rate': 0.5,
                'away_win_rate': 0.5,
                'home_form': 0.5,
                'away_form': 0.5,
                'h2h_record': 0.5
            }
        
        return features
    
    def _extract_contextual_features(self, game: Game) -> Dict[str, Optional[float]]:
        """Extract contextual features like weather, rest, travel."""
        features = {}
        
        try:
            # Weather impact (if available)
            if game.weather:
                features['weather'] = self._calculate_weather_impact(game.weather)
            else:
                features['weather'] = None
            
            # Injury impact (if available)
            if game.injuries:
                features['injury_impact'] = len(game.injuries) * -0.1  # Simple impact
            else:
                features['injury_impact'] = None
            
            # Rest days and travel (placeholders - would need schedule data)
            features['rest_home'] = None
            features['rest_away'] = None
            features['travel'] = None
            
        except Exception as e:
            logger.warning(f"Error extracting contextual features: {str(e)}")
            features = {
                'weather': None,
                'injury_impact': None,
                'rest_home': None,
                'rest_away': None,
                'travel': None
            }
        
        return features
    
    def _odds_to_probability(self, odds: float) -> float:
        """Convert American odds to implied probability."""
        try:
            if odds > 0:
                return 100 / (odds + 100)
            else:
                return abs(odds) / (abs(odds) + 100)
        except (ZeroDivisionError, TypeError):
            return 0.5
    
    def _calculate_recent_form(self, recent_results: List[str]) -> float:
        """Calculate recent form score from game results."""
        if not recent_results:
            return 0.5
        
        try:
            wins = sum(1 for result in recent_results if result.upper() == 'W')
            total = len(recent_results)
            return wins / total if total > 0 else 0.5
        except Exception:
            return 0.5
    
    def _calculate_weather_impact(self, weather_data: Dict[str, Any]) -> float:
        """Calculate weather impact score."""
        try:
            # Simple weather impact calculation
            # In reality, this would be more sophisticated
            impact = 0.0
            
            # Temperature impact
            temp = weather_data.get('temperature', 70)
            if temp < 32 or temp > 90:
                impact -= 0.1
            
            # Wind impact
            wind_speed = weather_data.get('wind_speed', 0)
            if wind_speed > 15:
                impact -= 0.05
            
            # Precipitation impact
            precipitation = weather_data.get('precipitation', 0)
            if precipitation > 0.1:
                impact -= 0.1
            
            return max(-0.5, min(0.5, impact))  # Clamp between -0.5 and 0.5
            
        except Exception:
            return 0.0
    
    def _get_default_feature_vector(self) -> FeatureVector:
        """Return default feature vector for error cases."""
        return FeatureVector(
            odds_value=0.0,
            odds_movement=None,
            market_efficiency=1.0,
            home_win_rate=0.5,
            away_win_rate=0.5,
            head_to_head_record=None,
            recent_form_home=0.5,
            recent_form_away=0.5,
            rest_days_home=None,
            rest_days_away=None,
            travel_distance=None,
            weather_impact=None,
            strength_of_schedule=None,
            injury_impact=None,
            motivation_factor=None
        )
    
    def batch_process_games(
        self, 
        games: List[Game],
        team_stats: Optional[Dict[str, TeamStats]] = None
    ) -> List[FeatureVector]:
        """Process multiple games into feature vectors."""
        feature_vectors = []
        
        for game in games:
            try:
                features = self.process_game_features(game, team_stats)
                feature_vectors.append(features)
            except Exception as e:
                logger.error(f"Error processing game {game.home_team} vs {game.away_team}: {str(e)}")
                feature_vectors.append(self._get_default_feature_vector())
        
        return feature_vectors
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Return feature importance scores (placeholder)."""
        # This would be populated by actual model training
        return {
            'odds_value': 0.25,
            'home_win_rate': 0.20,
            'away_win_rate': 0.20,
            'recent_form_home': 0.15,
            'recent_form_away': 0.15,
            'weather_impact': 0.05
        }