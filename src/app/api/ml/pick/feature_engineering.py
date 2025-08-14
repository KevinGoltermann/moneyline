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

try:
    from .models import Game, FeatureVector, TeamStats
except ImportError:
    from models import Game, FeatureVector, TeamStats


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
                # Basic odds and market features
                odds_value=odds_features.get('primary_odds', 0.0),
                odds_movement=odds_features.get('movement', None),
                market_efficiency=odds_features.get('efficiency', None),
                
                # Basic team performance
                home_win_rate=team_features.get('home_win_rate', 0.5),
                away_win_rate=team_features.get('away_win_rate', 0.5),
                head_to_head_record=team_features.get('h2h_record', None),
                recent_form_home=team_features.get('home_form', 0.5),
                recent_form_away=team_features.get('away_form', 0.5),
                
                # Advanced efficiency metrics
                home_offensive_rating=team_features.get('home_offensive_rating', 100.0),
                home_defensive_rating=team_features.get('home_defensive_rating', 100.0),
                home_net_rating=team_features.get('home_net_rating', 0.0),
                home_pace=team_features.get('home_pace', 100.0),
                away_offensive_rating=team_features.get('away_offensive_rating', 100.0),
                away_defensive_rating=team_features.get('away_defensive_rating', 100.0),
                away_net_rating=team_features.get('away_net_rating', 0.0),
                away_pace=team_features.get('away_pace', 100.0),
                
                # Matchup advantages
                offensive_matchup_advantage=team_features.get('offensive_matchup_advantage', 0.0),
                defensive_matchup_advantage=team_features.get('defensive_matchup_advantage', 0.0),
                pace_differential=team_features.get('pace_differential', 0.0),
                
                # Advanced form metrics
                home_form_weighted=team_features.get('home_form_weighted', 0.5),
                home_form_vs_quality=team_features.get('home_form_vs_quality', 0.5),
                away_form_weighted=team_features.get('away_form_weighted', 0.5),
                away_form_vs_quality=team_features.get('away_form_vs_quality', 0.5),
                home_form_trend=team_features.get('home_form_trend', 0.0),
                away_form_trend=team_features.get('away_form_trend', 0.0),
                
                # Strength of schedule
                home_sos_past=team_features.get('home_sos_past', 0.5),
                away_sos_past=team_features.get('away_sos_past', 0.5),
                home_sos_future=team_features.get('home_sos_future', 0.5),
                away_sos_future=team_features.get('away_sos_future', 0.5),
                home_record_vs_quality=team_features.get('home_record_vs_quality', 0.5),
                away_record_vs_quality=team_features.get('away_record_vs_quality', 0.5),
                
                # Contextual features
                rest_days_home=context_features.get('rest_home', None),
                rest_days_away=context_features.get('rest_away', None),
                travel_distance=context_features.get('travel', None),
                weather_impact=context_features.get('weather', None),
                
                # Advanced situational metrics
                fatigue_factor_home=context_features.get('fatigue_home', None),
                fatigue_factor_away=context_features.get('fatigue_away', None),
                timezone_adjustment=context_features.get('timezone_adj', None),
                altitude_adjustment=context_features.get('altitude_adj', None),
                
                # Injury and depth
                injury_impact=context_features.get('injury_impact', None),
                depth_chart_impact=context_features.get('depth_impact', None),
                
                # Motivation and psychological
                motivation_factor=context_features.get('motivation', None),
                revenge_game_factor=context_features.get('revenge_factor', None),
                playoff_implications=context_features.get('playoff_implications', None),
                
                # Market factors
                sharp_money_indicator=context_features.get('sharp_money', None),
                public_betting_percentage=context_features.get('public_betting', None),
                line_movement_significance=context_features.get('line_movement_sig', None)
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
        """Calculate comprehensive team performance features."""
        features = {}
        
        try:
            # Use provided team stats or default values
            if team_stats:
                home_stats = team_stats.get(game.home_team)
                away_stats = team_stats.get(game.away_team)
            else:
                # If no team stats provided, we'll use default values
                # The external API calls should be handled at a higher level
                home_stats = None
                away_stats = None
            
            if home_stats and away_stats:
                # Basic win rates
                features['home_win_rate'] = home_stats.get('win_percentage', 0.5)
                features['away_win_rate'] = away_stats.get('win_percentage', 0.5)
                
                # Advanced efficiency metrics
                features.update(self._calculate_efficiency_metrics(home_stats, away_stats))
                
                # Recent form with opponent adjustments
                features.update(self._calculate_advanced_form(home_stats, away_stats))
                
                # Strength of schedule analysis
                features.update(self._calculate_strength_of_schedule(home_stats, away_stats))
                
                # Head-to-head analysis
                features['h2h_record'] = self._calculate_head_to_head(
                    game.home_team, game.away_team, home_stats, away_stats
                )
                
            else:
                # Default values when no team stats available
                features = self._get_default_team_features()
                
        except Exception as e:
            logger.warning(f"Error calculating team features: {str(e)}")
            features = self._get_default_team_features()
        
        return features
    
    def _calculate_efficiency_metrics(
        self, 
        home_stats: Optional[Dict[str, Any]], 
        away_stats: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate offensive and defensive efficiency metrics."""
        features = {}
        
        try:
            # Home team efficiency - use API data or calculate from basic stats
            if home_stats:
                features['home_offensive_rating'] = home_stats.get('offensive_rating', 100.0)
                features['home_defensive_rating'] = home_stats.get('defensive_rating', 100.0)
                features['home_net_rating'] = home_stats.get('net_rating', 
                    features['home_offensive_rating'] - features['home_defensive_rating'])
                features['home_pace'] = home_stats.get('pace', 100.0)
                
                # Calculate situational ratings
                features['home_offensive_rating_home'] = home_stats.get('home_offensive_rating', 
                    features['home_offensive_rating'] * 1.05)  # Home advantage
                features['home_defensive_rating_home'] = home_stats.get('home_defensive_rating',
                    features['home_defensive_rating'] * 0.95)  # Home advantage
            else:
                features.update({
                    'home_offensive_rating': 100.0,
                    'home_defensive_rating': 100.0,
                    'home_net_rating': 0.0,
                    'home_pace': 100.0,
                    'home_offensive_rating_home': 105.0,
                    'home_defensive_rating_home': 95.0
                })
            
            # Away team efficiency
            if away_stats:
                features['away_offensive_rating'] = away_stats.get('offensive_rating', 100.0)
                features['away_defensive_rating'] = away_stats.get('defensive_rating', 100.0)
                features['away_net_rating'] = away_stats.get('net_rating',
                    features['away_offensive_rating'] - features['away_defensive_rating'])
                features['away_pace'] = away_stats.get('pace', 100.0)
                
                # Calculate situational ratings
                features['away_offensive_rating_away'] = away_stats.get('away_offensive_rating',
                    features['away_offensive_rating'] * 0.95)  # Away disadvantage
                features['away_defensive_rating_away'] = away_stats.get('away_defensive_rating',
                    features['away_defensive_rating'] * 1.05)  # Away disadvantage
            else:
                features.update({
                    'away_offensive_rating': 100.0,
                    'away_defensive_rating': 100.0,
                    'away_net_rating': 0.0,
                    'away_pace': 100.0,
                    'away_offensive_rating_away': 95.0,
                    'away_defensive_rating_away': 105.0
                })
            
            # Advanced matchup analysis
            features['offensive_matchup_advantage'] = (
                features['home_offensive_rating_home'] - features['away_defensive_rating_away']
            )
            features['defensive_matchup_advantage'] = (
                features['away_offensive_rating_away'] - features['home_defensive_rating_home']
            )
            features['pace_differential'] = abs(features['home_pace'] - features['away_pace'])
            
            # Net rating differential (key predictor)
            features['net_rating_differential'] = features['home_net_rating'] - features['away_net_rating']
            
            # Efficiency consistency (lower variance = more consistent)
            features['home_efficiency_consistency'] = self._calculate_efficiency_consistency(home_stats)
            features['away_efficiency_consistency'] = self._calculate_efficiency_consistency(away_stats)
            
        except Exception as e:
            logger.warning(f"Error calculating efficiency metrics: {str(e)}")
            features = {
                'home_offensive_rating': 100.0, 'home_defensive_rating': 100.0,
                'home_net_rating': 0.0, 'home_pace': 100.0,
                'away_offensive_rating': 100.0, 'away_defensive_rating': 100.0,
                'away_net_rating': 0.0, 'away_pace': 100.0,
                'offensive_matchup_advantage': 0.0, 'defensive_matchup_advantage': 0.0,
                'pace_differential': 0.0, 'net_rating_differential': 0.0,
                'home_efficiency_consistency': 0.5, 'away_efficiency_consistency': 0.5
            }
        
        return features
    
    def _calculate_efficiency_consistency(self, team_stats: Optional[Dict[str, Any]]) -> float:
        """Calculate how consistent a team's efficiency is game-to-game."""
        if not team_stats or 'recent_games' not in team_stats:
            return 0.5  # Neutral consistency
        
        try:
            recent_games = team_stats['recent_games'][:10]  # Last 10 games
            if len(recent_games) < 5:
                return 0.5
            
            # Calculate variance in scoring margin
            margins = [game.get('margin', 0) for game in recent_games]
            if not margins:
                return 0.5
            
            mean_margin = sum(margins) / len(margins)
            variance = sum((m - mean_margin) ** 2 for m in margins) / len(margins)
            
            # Convert variance to consistency score (lower variance = higher consistency)
            # Normalize to 0-1 scale where 1 = very consistent, 0 = very inconsistent
            consistency = max(0.0, min(1.0, 1.0 - (variance / 400.0)))  # 400 is rough max variance
            
            return consistency
            
        except Exception:
            return 0.5
    
    def _calculate_advanced_form(
        self, 
        home_stats: Optional[Dict[str, Any]], 
        away_stats: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate recent form with exponential decay and opponent adjustments."""
        features = {}
        
        try:
            # Home team advanced form
            home_recent_games = home_stats.get('recent_games', []) if home_stats else []
            if home_recent_games:
                features['home_form_weighted'] = self._calculate_weighted_form(home_recent_games)
                features['home_form_vs_quality'] = self._calculate_form_vs_quality_opponents(home_recent_games)
                features['home_clutch_performance'] = self._calculate_clutch_performance(home_recent_games)
                features['home_blowout_tendency'] = self._calculate_blowout_tendency(home_recent_games)
            else:
                # Use basic recent form if available
                recent_form = home_stats.get('recent_form', []) if home_stats else []
                features['home_form_weighted'] = self._calculate_recent_form(recent_form)
                features['home_form_vs_quality'] = 0.5
                features['home_clutch_performance'] = 0.5
                features['home_blowout_tendency'] = 0.5
            
            # Away team advanced form
            away_recent_games = away_stats.get('recent_games', []) if away_stats else []
            if away_recent_games:
                features['away_form_weighted'] = self._calculate_weighted_form(away_recent_games)
                features['away_form_vs_quality'] = self._calculate_form_vs_quality_opponents(away_recent_games)
                features['away_clutch_performance'] = self._calculate_clutch_performance(away_recent_games)
                features['away_blowout_tendency'] = self._calculate_blowout_tendency(away_recent_games)
            else:
                # Use basic recent form if available
                recent_form = away_stats.get('recent_form', []) if away_stats else []
                features['away_form_weighted'] = self._calculate_recent_form(recent_form)
                features['away_form_vs_quality'] = 0.5
                features['away_clutch_performance'] = 0.5
                features['away_blowout_tendency'] = 0.5
            
            # Form momentum and trends
            features['home_form_trend'] = self._calculate_form_trend(home_recent_games)
            features['away_form_trend'] = self._calculate_form_trend(away_recent_games)
            
            # Comparative form analysis
            features['form_differential'] = features['home_form_weighted'] - features['away_form_weighted']
            features['clutch_differential'] = features['home_clutch_performance'] - features['away_clutch_performance']
            
        except Exception as e:
            logger.warning(f"Error calculating advanced form: {str(e)}")
            features = {
                'home_form_weighted': 0.5, 'home_form_vs_quality': 0.5,
                'away_form_weighted': 0.5, 'away_form_vs_quality': 0.5,
                'home_form_trend': 0.0, 'away_form_trend': 0.0,
                'home_clutch_performance': 0.5, 'away_clutch_performance': 0.5,
                'home_blowout_tendency': 0.5, 'away_blowout_tendency': 0.5,
                'form_differential': 0.0, 'clutch_differential': 0.0
            }
        
        return features
    
    def _calculate_clutch_performance(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate performance in close games (clutch situations)."""
        if not recent_games:
            return 0.5
        
        try:
            close_games = [
                game for game in recent_games 
                if abs(game.get('margin', 0)) <= 7  # Games decided by 7 points or less
            ]
            
            if not close_games:
                return 0.5  # No close games to analyze
            
            wins_in_close_games = sum(
                1 for game in close_games if game.get('result') == 'W'
            )
            
            return wins_in_close_games / len(close_games)
            
        except Exception:
            return 0.5
    
    def _calculate_blowout_tendency(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate tendency to win/lose by large margins."""
        if not recent_games:
            return 0.5
        
        try:
            total_margin = 0
            game_count = 0
            
            for game in recent_games:
                margin = game.get('margin', 0)
                if game.get('result') == 'W':
                    total_margin += max(0, margin)  # Only count positive margins for wins
                    game_count += 1
                elif game.get('result') == 'L':
                    total_margin += max(0, -margin)  # Count absolute margin for losses
                    game_count += 1
            
            if game_count == 0:
                return 0.5
            
            avg_margin = total_margin / game_count
            
            # Normalize to 0-1 scale where 1 = tends to blow out, 0 = close games
            return min(1.0, avg_margin / 20.0)  # 20+ point average = max blowout tendency
            
        except Exception:
            return 0.5
    
    def _calculate_strength_of_schedule(
        self, 
        home_stats: Optional[Dict[str, Any]], 
        away_stats: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate comprehensive strength of schedule metrics."""
        features = {}
        
        try:
            # Past strength of schedule from API data
            features['home_sos_past'] = home_stats.get('sos_past', 0.5) if home_stats else 0.5
            features['away_sos_past'] = away_stats.get('sos_past', 0.5) if away_stats else 0.5
            
            # Future strength of schedule
            features['home_sos_future'] = home_stats.get('sos_future', 0.5) if home_stats else 0.5
            features['away_sos_future'] = away_stats.get('sos_future', 0.5) if away_stats else 0.5
            
            # Calculate SOS from recent games if API data not available
            if features['home_sos_past'] == 0.5 and home_stats and 'recent_games' in home_stats:
                features['home_sos_past'] = self._calculate_sos_from_games(home_stats['recent_games'])
            
            if features['away_sos_past'] == 0.5 and away_stats and 'recent_games' in away_stats:
                features['away_sos_past'] = self._calculate_sos_from_games(away_stats['recent_games'])
            
            # Opponent-adjusted records
            features['home_record_vs_quality'] = self._calculate_record_vs_quality(home_stats)
            features['away_record_vs_quality'] = self._calculate_record_vs_quality(away_stats)
            
            # SOS differential (advantage metric)
            features['sos_differential'] = features['away_sos_past'] - features['home_sos_past']
            
            # Quality opponent performance
            features['home_quality_wins'] = self._calculate_quality_wins(home_stats)
            features['away_quality_wins'] = self._calculate_quality_wins(away_stats)
            
        except Exception as e:
            logger.warning(f"Error calculating strength of schedule: {str(e)}")
            features = {
                'home_sos_past': 0.5, 'away_sos_past': 0.5,
                'home_sos_future': 0.5, 'away_sos_future': 0.5,
                'home_record_vs_quality': 0.5, 'away_record_vs_quality': 0.5,
                'sos_differential': 0.0, 'home_quality_wins': 0.0, 'away_quality_wins': 0.0
            }
        
        return features
    
    def _calculate_sos_from_games(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate strength of schedule from recent games."""
        if not recent_games:
            return 0.5
        
        try:
            total_opponent_strength = 0
            game_count = 0
            
            for game in recent_games:
                opponent_rating = game.get('opponent_rating', 100.0)
                # Normalize rating to 0-1 scale (assuming 80-120 range)
                normalized_rating = (opponent_rating - 80) / 40.0
                normalized_rating = max(0.0, min(1.0, normalized_rating))
                
                total_opponent_strength += normalized_rating
                game_count += 1
            
            return total_opponent_strength / game_count if game_count > 0 else 0.5
            
        except Exception:
            return 0.5
    
    def _calculate_quality_wins(self, team_stats: Optional[Dict[str, Any]]) -> float:
        """Calculate percentage of wins against quality opponents."""
        if not team_stats or 'recent_games' not in team_stats:
            return 0.0
        
        try:
            recent_games = team_stats['recent_games']
            quality_games = [
                game for game in recent_games 
                if game.get('opponent_rating', 100.0) >= 105.0  # Above average teams
            ]
            
            if not quality_games:
                return 0.0
            
            quality_wins = sum(
                1 for game in quality_games if game.get('result') == 'W'
            )
            
            return quality_wins / len(quality_games)
            
        except Exception:
            return 0.0
    
    def _calculate_weighted_form(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate form with exponential decay weighting."""
        if not recent_games:
            return 0.5
        
        try:
            total_weight = 0.0
            weighted_score = 0.0
            decay_factor = 0.9  # More recent games weighted higher
            
            for i, game in enumerate(recent_games[:10]):  # Last 10 games
                weight = decay_factor ** i
                result = 1.0 if game.get('result') == 'W' else 0.0
                
                # Adjust for opponent strength
                opponent_strength = game.get('opponent_rating', 100.0) / 100.0
                adjusted_result = result * (1.0 + (opponent_strength - 1.0) * 0.5)
                
                weighted_score += adjusted_result * weight
                total_weight += weight
            
            return min(1.0, max(0.0, weighted_score / total_weight if total_weight > 0 else 0.5))
            
        except Exception:
            return 0.5
    
    def _calculate_form_vs_quality_opponents(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate form specifically against quality opponents."""
        if not recent_games:
            return 0.5
        
        try:
            quality_games = [
                game for game in recent_games 
                if game.get('opponent_rating', 100.0) >= 105.0  # Above average teams
            ]
            
            if not quality_games:
                return 0.5
            
            wins = sum(1 for game in quality_games if game.get('result') == 'W')
            return wins / len(quality_games)
            
        except Exception:
            return 0.5
    
    def _calculate_form_trend(self, recent_games: List[Dict[str, Any]]) -> float:
        """Calculate whether team is trending up or down."""
        if len(recent_games) < 4:
            return 0.0
        
        try:
            # Compare first half vs second half of recent games
            mid_point = len(recent_games) // 2
            early_games = recent_games[mid_point:]  # Older games
            recent_games_subset = recent_games[:mid_point]  # More recent games
            
            early_win_rate = sum(
                1 for game in early_games if game.get('result') == 'W'
            ) / len(early_games)
            
            recent_win_rate = sum(
                1 for game in recent_games_subset if game.get('result') == 'W'
            ) / len(recent_games_subset)
            
            return recent_win_rate - early_win_rate  # Positive = improving
            
        except Exception:
            return 0.0
    
    def _calculate_record_vs_quality(self, team_stats: Optional[Any]) -> float:
        """Calculate record against quality opponents."""
        if not team_stats:
            return 0.5
        
        try:
            quality_record = getattr(team_stats, 'record_vs_quality', None)
            if quality_record:
                wins, losses = quality_record.split('-')
                total = int(wins) + int(losses)
                return int(wins) / total if total > 0 else 0.5
            return 0.5
        except Exception:
            return 0.5
    
    def _calculate_head_to_head(
        self, 
        home_team: str, 
        away_team: str, 
        home_stats: Optional[Any], 
        away_stats: Optional[Any]
    ) -> float:
        """Calculate head-to-head record with recency weighting."""
        try:
            # This would query historical matchup data
            # For now, return neutral value
            return 0.5
        except Exception:
            return 0.5
    
    def _get_default_team_features(self) -> Dict[str, float]:
        """Return default team features when data is unavailable."""
        return {
            'home_win_rate': 0.5, 'away_win_rate': 0.5,
            'home_offensive_rating': 100.0, 'home_defensive_rating': 100.0,
            'home_net_rating': 0.0, 'home_pace': 100.0,
            'away_offensive_rating': 100.0, 'away_defensive_rating': 100.0,
            'away_net_rating': 0.0, 'away_pace': 100.0,
            'offensive_matchup_advantage': 0.0, 'defensive_matchup_advantage': 0.0,
            'pace_differential': 0.0, 'home_form_weighted': 0.5,
            'home_form_vs_quality': 0.5, 'away_form_weighted': 0.5,
            'away_form_vs_quality': 0.5, 'home_form_trend': 0.0,
            'away_form_trend': 0.0, 'home_sos_past': 0.5,
            'away_sos_past': 0.5, 'home_sos_future': 0.5,
            'away_sos_future': 0.5, 'home_record_vs_quality': 0.5,
            'away_record_vs_quality': 0.5, 'h2h_record': 0.5
        }
    
    def _extract_contextual_features(self, game: Game) -> Dict[str, Optional[float]]:
        """Extract comprehensive contextual features including situational analysis."""
        features = {}
        
        try:
            # Weather impact (enhanced sport-specific analysis)
            if game.weather:
                features['weather'] = self._calculate_advanced_weather_impact(game.weather, game.league)
            else:
                features['weather'] = None
            
            # Rest and travel analysis
            rest_travel_features = self._calculate_rest_and_travel_factors(game)
            features.update(rest_travel_features)
            
            # Venue and environmental factors
            venue_features = self._calculate_venue_factors(game)
            features.update(venue_features)
            
            # Injury impact (enhanced with position weighting)
            if game.injuries:
                features['injury_impact'] = self._calculate_advanced_injury_impact(
                    game.injuries, game.league
                )
            else:
                features['injury_impact'] = None
            
            # Motivation and psychological factors
            motivation_features = self._calculate_motivation_factors(game)
            features.update(motivation_features)
            
            # Market and betting factors (would integrate with odds API)
            market_features = self._calculate_market_factors(game)
            features.update(market_features)
            
        except Exception as e:
            logger.warning(f"Error extracting contextual features: {str(e)}")
            features = self._get_default_contextual_features()
        
        return features
    
    def _calculate_advanced_weather_impact(
        self, 
        weather_data: Dict[str, Any], 
        league: str
    ) -> float:
        """Calculate sport-specific weather impact."""
        try:
            impact = 0.0
            temp = weather_data.get('temperature', 70)
            wind_speed = weather_data.get('wind_speed', 0)
            precipitation = weather_data.get('precipitation', 0)
            
            if league == 'NFL':
                # Cold weather impact on passing games
                if temp < 35:
                    impact -= 0.15  # Favor running games
                elif temp > 85:
                    impact -= 0.05  # Heat fatigue
                
                # Wind impact on passing and kicking
                if wind_speed > 15:
                    impact -= 0.1  # Reduces passing accuracy
                elif wind_speed > 25:
                    impact -= 0.2  # Significant impact
                
                # Precipitation impact
                if precipitation > 0.1:
                    impact -= 0.1  # Slippery conditions
                
            elif league == 'MLB':
                # Wind impact on home runs
                if wind_speed > 10:
                    wind_direction = weather_data.get('wind_direction', 0)
                    # Simplified: assume outfield wind reduces scoring
                    if 45 <= wind_direction <= 315:  # Roughly outfield direction
                        impact -= 0.05
                    else:
                        impact += 0.05  # Infield wind helps offense
                
                # Temperature impact on ball flight
                if temp > 80:
                    impact += 0.03  # Hot air = more home runs
                elif temp < 50:
                    impact -= 0.03  # Cold air = fewer home runs
            
            elif league in ['NBA', 'NHL']:
                # Indoor sports - minimal weather impact
                impact = 0.0
            
            return max(-0.3, min(0.3, impact))  # Clamp impact
            
        except Exception:
            return 0.0
    
    def _calculate_rest_and_travel_factors(self, game: Game) -> Dict[str, Optional[float]]:
        """Calculate rest days, travel distance, and fatigue factors from actual schedule data."""
        features = {}
        
        try:
            # Use actual schedule data if available
            if hasattr(game, 'schedule_context'):
                home_schedule = game.schedule_context.get('home_schedule', {})
                away_schedule = game.schedule_context.get('away_schedule', {})
                
                # Calculate rest days from last game
                features['rest_home'] = self._calculate_rest_days(
                    home_schedule.get('past_games', [])
                )
                features['rest_away'] = self._calculate_rest_days(
                    away_schedule.get('past_games', [])
                )
                
                # Calculate travel distance for away team
                features['travel'] = self._calculate_actual_travel_distance(
                    away_schedule.get('past_games', []), game
                )
            else:
                # Fallback to estimates
                features['rest_home'] = 3
                features['rest_away'] = 2
                features['travel'] = self._estimate_travel_distance(game)
            
            # Calculate fatigue factors based on rest and travel
            features['fatigue_home'] = self._calculate_fatigue_factor(
                features['rest_home'], 0  # Home team no travel for this game
            )
            features['fatigue_away'] = self._calculate_fatigue_factor(
                features['rest_away'], features['travel']
            )
            
            # Time zone adjustment
            features['timezone_adj'] = self._calculate_timezone_impact(game)
            
        except Exception as e:
            logger.warning(f"Error calculating rest/travel factors: {str(e)}")
            features = {
                'rest_home': 3, 'rest_away': 3, 'travel': 0.0,
                'fatigue_home': 0.0, 'fatigue_away': 0.0, 'timezone_adj': 0.0
            }
        
        return features
    
    def _calculate_rest_days(self, past_games: List[Dict[str, Any]]) -> int:
        """Calculate days of rest since last game."""
        if not past_games:
            return 3  # Default
        
        try:
            # Get most recent game
            last_game = past_games[0]  # Assuming sorted by recency
            last_game_date = datetime.fromisoformat(last_game['date'].replace('Z', '+00:00'))
            
            # Calculate days since last game
            now = datetime.utcnow().replace(tzinfo=last_game_date.tzinfo)
            days_rest = (now - last_game_date).days
            
            return max(0, days_rest)
            
        except Exception:
            return 3  # Default fallback
    
    def _calculate_actual_travel_distance(
        self, 
        past_games: List[Dict[str, Any]], 
        current_game: Game
    ) -> float:
        """Calculate actual travel distance based on schedule."""
        try:
            if not past_games:
                return self._estimate_travel_distance(current_game)
            
            # Get last game location
            last_game = past_games[0]
            
            # If last game was away, they're traveling from that city
            # If last game was home, they're traveling from home city
            # This is simplified - in production would use actual venue coordinates
            
            last_travel = last_game.get('travel_distance', 0)
            current_travel = self._estimate_travel_distance(current_game)
            
            # Return the travel distance for current game
            return current_travel
            
        except Exception:
            return self._estimate_travel_distance(current_game)
    
    def _calculate_venue_factors(self, game: Game) -> Dict[str, Optional[float]]:
        """Calculate venue-specific factors using actual venue data."""
        features = {}
        
        try:
            if hasattr(game, 'venue_info') and game.venue_info:
                venue_info = game.venue_info
                
                # Altitude adjustment based on actual altitude
                altitude = venue_info.get('altitude', 0)
                features['altitude_adj'] = self._calculate_altitude_impact(altitude, game.league)
                
                # Additional venue factors could include:
                # - Dome vs outdoor effects
                # - Field surface type
                # - Capacity/crowd noise effects
                
            elif game.venue:
                # Fallback to lookup
                features['altitude_adj'] = self._get_altitude_adjustment(game.venue)
            else:
                features['altitude_adj'] = 0.0
                
        except Exception:
            features['altitude_adj'] = 0.0
        
        return features
    
    def _calculate_altitude_impact(self, altitude_feet: float, league: str) -> float:
        """Calculate altitude impact based on actual elevation and sport."""
        try:
            if altitude_feet < 1000:
                return 0.0  # Sea level, no impact
            
            # Different sports affected differently by altitude
            if league == 'MLB':
                # Higher altitude = more home runs (thinner air)
                if altitude_feet > 5000:  # Denver-like altitude
                    return 0.08  # Significant offensive boost
                elif altitude_feet > 3000:
                    return 0.04  # Moderate boost
                else:
                    return 0.02  # Slight boost
                    
            elif league == 'NFL':
                # Higher altitude can affect kicking accuracy and stamina
                if altitude_feet > 5000:
                    return -0.03  # Slight negative for visiting teams
                elif altitude_feet > 3000:
                    return -0.01
                else:
                    return 0.0
                    
            elif league in ['NBA', 'NHL']:
                # Indoor sports less affected, but stamina can be impacted
                if altitude_feet > 5000:
                    return -0.02  # Slight fatigue effect
                else:
                    return 0.0
            
            return 0.0
            
        except Exception:
            return 0.0
    
    def _calculate_advanced_injury_impact(
        self, 
        injuries: List[str], 
        league: str
    ) -> float:
        """Calculate position-weighted injury impact."""
        try:
            if not injuries:
                return 0.0
            
            total_impact = 0.0
            
            for injury_str in injuries:
                # Parse injury string (simplified)
                impact = -0.05  # Base impact per injury
                
                # Position-specific weighting (simplified)
                if league == 'NFL':
                    if 'QB' in injury_str.upper():
                        impact = -0.25  # Quarterback is critical
                    elif any(pos in injury_str.upper() for pos in ['RB', 'WR', 'TE']):
                        impact = -0.15  # Skill positions
                    elif any(pos in injury_str.upper() for pos in ['OL', 'DL']):
                        impact = -0.10  # Line positions
                elif league == 'NBA':
                    if any(pos in injury_str.upper() for pos in ['PG', 'SG']):
                        impact = -0.20  # Guards
                    elif any(pos in injury_str.upper() for pos in ['SF', 'PF', 'C']):
                        impact = -0.15  # Forwards/Centers
                
                # Severity adjustment (simplified)
                if 'OUT' in injury_str.upper():
                    impact *= 1.5
                elif 'DOUBTFUL' in injury_str.upper():
                    impact *= 1.2
                elif 'QUESTIONABLE' in injury_str.upper():
                    impact *= 0.8
                
                total_impact += impact
            
            return max(-0.5, total_impact)  # Cap at -50% impact
            
        except Exception:
            return -0.1  # Default moderate impact
    
    def _calculate_motivation_factors(self, game: Game) -> Dict[str, Optional[float]]:
        """Calculate motivation and psychological factors."""
        features = {}
        
        try:
            # These would be calculated from season context, standings, etc.
            # For now, using placeholders
            
            features['motivation'] = 0.0  # Neutral baseline
            features['revenge_factor'] = 0.0  # No revenge game detected
            features['playoff_implications'] = 0.0  # No playoff implications
            
            # In production, these would check:
            # - Playoff race standings
            # - Previous season results
            # - Rivalry games
            # - Season context (elimination games, etc.)
            
        except Exception:
            features = {
                'motivation': 0.0,
                'revenge_factor': 0.0,
                'playoff_implications': 0.0
            }
        
        return features
    
    def _calculate_market_factors(self, game: Game) -> Dict[str, Optional[float]]:
        """Calculate market and betting-related factors."""
        features = {}
        
        try:
            # These would integrate with odds API for line movement
            # For now, using placeholders
            
            features['sharp_money'] = None  # Sharp money indicator
            features['public_betting'] = None  # Public betting percentage
            features['line_movement_sig'] = None  # Line movement significance
            
            # In production, these would track:
            # - Line movement over time
            # - Betting volume patterns
            # - Sharp vs public money indicators
            
        except Exception:
            features = {
                'sharp_money': None,
                'public_betting': None,
                'line_movement_sig': None
            }
        
        return features
    
    def _estimate_travel_distance(self, game: Game) -> float:
        """Estimate travel distance for away team."""
        # Simplified distance estimation
        # In production, would use actual venue coordinates
        
        venue_distances = {
            # Mock distances - would be calculated from venue database
            'Arrowhead Stadium': 500.0,  # Miles from average location
            'Crypto.com Arena': 800.0,
            'Lambeau Field': 600.0,
        }
        
        return venue_distances.get(game.venue, 400.0)  # Default moderate distance
    
    def _calculate_fatigue_factor(self, rest_days: int, travel_distance: float) -> float:
        """Calculate fatigue factor based on rest and travel."""
        try:
            fatigue = 0.0
            
            # Rest days impact
            if rest_days < 2:
                fatigue -= 0.1  # Tired from short rest
            elif rest_days > 7:
                fatigue -= 0.05  # Rust from long rest
            
            # Travel impact
            if travel_distance > 1000:
                fatigue -= 0.05  # Long distance travel
            elif travel_distance > 2000:
                fatigue -= 0.1  # Cross-country travel
            
            return max(-0.2, fatigue)  # Cap fatigue impact
            
        except Exception:
            return 0.0
    
    def _calculate_timezone_impact(self, game: Game) -> float:
        """Calculate time zone change impact on away team."""
        # Simplified timezone impact
        # In production, would calculate actual timezone differences
        
        if game.venue:
            # Mock timezone impacts
            west_coast_venues = ['Crypto.com Arena', 'Oracle Park']
            east_coast_venues = ['Madison Square Garden', 'TD Garden']
            
            if game.venue in west_coast_venues:
                return -0.03  # West coast games harder for east coast teams
            elif game.venue in east_coast_venues:
                return 0.02  # East coast games easier for west coast teams
        
        return 0.0
    
    def _get_altitude_adjustment(self, venue: str) -> float:
        """Get altitude adjustment for venue."""
        # High altitude venues
        high_altitude_venues = {
            'Coors Field': 0.05,  # Denver - helps offense in baseball
            'Sports Authority Field': -0.02,  # Denver - affects kicking in NFL
        }
        
        return high_altitude_venues.get(venue, 0.0)
    
    def _get_default_contextual_features(self) -> Dict[str, Optional[float]]:
        """Return default contextual features."""
        return {
            'weather': None, 'rest_home': 3, 'rest_away': 3,
            'travel': 0.0, 'fatigue_home': 0.0, 'fatigue_away': 0.0,
            'timezone_adj': 0.0, 'altitude_adj': 0.0, 'injury_impact': None,
            'depth_impact': None, 'motivation': None, 'revenge_factor': None,
            'playoff_implications': None, 'sharp_money': None,
            'public_betting': None, 'line_movement_sig': None
        }
    
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
            # Basic odds and market features
            odds_value=0.0,
            odds_movement=None,
            market_efficiency=1.0,
            
            # Basic team performance
            home_win_rate=0.5,
            away_win_rate=0.5,
            head_to_head_record=None,
            recent_form_home=0.5,
            recent_form_away=0.5,
            
            # Advanced efficiency metrics
            home_offensive_rating=100.0,
            home_defensive_rating=100.0,
            home_net_rating=0.0,
            home_pace=100.0,
            away_offensive_rating=100.0,
            away_defensive_rating=100.0,
            away_net_rating=0.0,
            away_pace=100.0,
            
            # Matchup advantages
            offensive_matchup_advantage=0.0,
            defensive_matchup_advantage=0.0,
            pace_differential=0.0,
            
            # Advanced form metrics
            home_form_weighted=0.5,
            home_form_vs_quality=0.5,
            away_form_weighted=0.5,
            away_form_vs_quality=0.5,
            home_form_trend=0.0,
            away_form_trend=0.0,
            
            # Strength of schedule
            home_sos_past=0.5,
            away_sos_past=0.5,
            home_sos_future=0.5,
            away_sos_future=0.5,
            home_record_vs_quality=0.5,
            away_record_vs_quality=0.5,
            
            # Contextual features
            rest_days_home=None,
            rest_days_away=None,
            travel_distance=None,
            weather_impact=None,
            
            # Advanced situational metrics
            fatigue_factor_home=None,
            fatigue_factor_away=None,
            timezone_adjustment=None,
            altitude_adjustment=None,
            
            # Injury and depth
            injury_impact=None,
            depth_chart_impact=None,
            
            # Motivation and psychological
            motivation_factor=None,
            revenge_game_factor=None,
            playoff_implications=None,
            
            # Market factors
            sharp_money_indicator=None,
            public_betting_percentage=None,
            line_movement_significance=None
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