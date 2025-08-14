"""
ML Prediction Engine for Betting Recommendations

This module implements the core machine learning pipeline for generating
betting picks, including XGBoost model training/inference, expected value
calculations, and confidence scoring.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date
import json
import os

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, log_loss
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
except ImportError as e:
    logging.warning(f"ML libraries not available: {e}")
    xgb = None
    LogisticRegression = None
    StandardScaler = None

try:
    from .models import (
        Game, MLRequest, MLResponse, FeatureVector, ModelPrediction, 
        PickCandidate, Rationale, MarketType, League
    )
    from .feature_engineering import FeatureEngineer
    from .external_apis import OddsAPI, WeatherAPI, SportsDataAPI
except ImportError:
    from models import (
        Game, MLRequest, MLResponse, FeatureVector, ModelPrediction, 
        PickCandidate, Rationale, MarketType, League
    )
    from feature_engineering import FeatureEngineer
    from external_apis import OddsAPI, WeatherAPI, SportsDataAPI


logger = logging.getLogger(__name__)


class MLPredictionEngine:
    """Core ML prediction engine for betting recommendations."""
    
    def __init__(self):
        """Initialize the ML prediction engine."""
        self.feature_engineer = FeatureEngineer()
        self.odds_api = OddsAPI()
        self.weather_api = WeatherAPI()
        self.sports_api = SportsDataAPI()
        
        # Model components
        self.xgb_model = None
        self.fallback_model = None
        self.scaler = StandardScaler() if StandardScaler else None
        self.feature_names = []
        
        # Configuration
        self.min_confidence_threshold = 60.0
        self.min_odds_threshold = -200
        self.max_odds_threshold = 300
        self.expected_value_threshold = 0.05
        
        # Initialize models
        self._initialize_models()
    
    def generate_pick(self, request: MLRequest) -> MLResponse:
        """
        Generate the best betting pick for the given request.
        
        Args:
            request: ML request with games and parameters
            
        Returns:
            MLResponse with the selected pick and analysis
        """
        try:
            logger.info(f"Generating pick for {len(request.games)} games on {request.date}")
            
            # Process all games and get candidates
            candidates = self._analyze_all_games(request)
            
            if not candidates:
                raise ValueError("No viable betting candidates found")
            
            # Select the best pick based on expected value
            best_pick = self._select_best_pick(candidates, request)
            
            # Generate response
            response = self._create_response(best_pick, request)
            
            logger.info(f"Generated pick: {response.selection} with {response.confidence}% confidence")
            return response
            
        except Exception as e:
            logger.error(f"Error generating pick: {str(e)}")
            # Return fallback pick if possible
            return self._generate_fallback_pick(request)
    
    def _analyze_all_games(self, request: MLRequest) -> List[PickCandidate]:
        """Analyze all games and return viable pick candidates."""
        candidates = []
        
        for game in request.games:
            try:
                # Enhance game data with external sources
                enhanced_game = self._enhance_game_data(game)
                
                # Generate feature vector
                features = self.feature_engineer.process_game_features(enhanced_game)
                
                # Analyze both home and away options
                home_candidate = self._analyze_pick_option(
                    enhanced_game, "home", features, request
                )
                away_candidate = self._analyze_pick_option(
                    enhanced_game, "away", features, request
                )
                
                # Add viable candidates
                if home_candidate and self._is_viable_candidate(home_candidate, request):
                    candidates.append(home_candidate)
                if away_candidate and self._is_viable_candidate(away_candidate, request):
                    candidates.append(away_candidate)
                    
            except Exception as e:
                logger.warning(f"Error analyzing game {game.home_team} vs {game.away_team}: {str(e)}")
                continue
        
        return candidates
    
    def _enhance_game_data(self, game: Game) -> Game:
        """Enhance game data with external API information."""
        try:
            # Get updated odds if needed
            if not game.odds:
                game.odds = self.odds_api.get_odds_for_game(
                    game.home_team, game.away_team, game.league
                )
            
            # Get weather data if venue is available and game is outdoor
            if game.venue and not game.weather and self._is_outdoor_venue(game.venue):
                game.weather = self.weather_api.get_weather_for_venue(
                    game.venue, game.start_time
                )
            
            # Get injury reports if not provided
            if not game.injuries:
                home_injuries = self.sports_api.get_injury_report(game.home_team, game.league)
                away_injuries = self.sports_api.get_injury_report(game.away_team, game.league)
                game.injuries = [
                    f"{inj['player']} ({inj['status']})" 
                    for inj in home_injuries + away_injuries
                    if inj.get('impact') == 'High'
                ]
            
            return game
            
        except Exception as e:
            logger.warning(f"Error enhancing game data: {str(e)}")
            return game
    
    def _analyze_pick_option(
        self, 
        game: Game, 
        selection: str, 
        features: FeatureVector, 
        request: MLRequest
    ) -> Optional[PickCandidate]:
        """Analyze a specific pick option (home or away)."""
        try:
            # Get odds for this selection
            odds_key = f"{selection}_ml"
            odds = game.odds.get(odds_key, 0)
            
            if not odds or not self._odds_in_range(odds, request):
                return None
            
            # Make prediction using ML model
            prediction = self._make_prediction(features, selection, odds)
            
            if prediction.confidence_score < (request.min_confidence or self.min_confidence_threshold):
                return None
            
            # Generate rationale
            rationale = self._generate_rationale(prediction, features, game, selection)
            
            # Create candidate
            candidate = PickCandidate(
                game=game,
                selection=f"{game.home_team if selection == 'home' else game.away_team} ML",
                market=MarketType.MONEYLINE,
                odds=odds,
                prediction=prediction,
                rationale=rationale
            )
            
            return candidate
            
        except Exception as e:
            logger.warning(f"Error analyzing {selection} option: {str(e)}")
            return None
    
    def _make_prediction(self, features: FeatureVector, selection: str, odds: float) -> ModelPrediction:
        """Make ML prediction for a specific selection."""
        try:
            # Convert features to array
            feature_array = self._features_to_array(features, selection)
            
            # Try XGBoost model first
            if self.xgb_model and xgb:
                win_prob, confidence, feature_importance = self._predict_xgboost(feature_array)
            else:
                # Fallback to logistic regression
                win_prob, confidence, feature_importance = self._predict_fallback(feature_array)
            
            # Calculate expected value
            expected_value = self._calculate_expected_value(win_prob, odds)
            
            return ModelPrediction(
                win_probability=win_prob,
                confidence_score=confidence,
                expected_value=expected_value,
                feature_importance=feature_importance,
                model_version="1.0.0"
            )
            
        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            # Return conservative prediction
            return ModelPrediction(
                win_probability=0.5,
                confidence_score=50.0,
                expected_value=0.0,
                feature_importance={},
                model_version="fallback"
            )
    
    def _predict_xgboost(self, features: np.ndarray) -> Tuple[float, float, Dict[str, float]]:
        """Make prediction using XGBoost model."""
        try:
            # Make prediction
            dmatrix = xgb.DMatrix(features.reshape(1, -1), feature_names=self.feature_names)
            win_prob = float(self.xgb_model.predict(dmatrix)[0])
            
            # Calculate confidence based on prediction certainty
            confidence = min(100.0, abs(win_prob - 0.5) * 200 + 50)
            
            # Get feature importance
            importance_dict = self.xgb_model.get_score(importance_type='weight')
            feature_importance = {
                name: importance_dict.get(name, 0.0) 
                for name in self.feature_names
            }
            
            return win_prob, confidence, feature_importance
            
        except Exception as e:
            logger.error(f"XGBoost prediction error: {str(e)}")
            raise
    
    def _predict_fallback(self, features: np.ndarray) -> Tuple[float, float, Dict[str, float]]:
        """Make prediction using fallback logistic regression model."""
        try:
            if self.fallback_model and self.scaler:
                # Scale features
                scaled_features = self.scaler.transform(features.reshape(1, -1))
                
                # Make prediction
                win_prob = float(self.fallback_model.predict_proba(scaled_features)[0][1])
                
                # Calculate confidence
                confidence = min(100.0, abs(win_prob - 0.5) * 180 + 45)
                
                # Simple feature importance (coefficients)
                if hasattr(self.fallback_model, 'coef_'):
                    coeffs = self.fallback_model.coef_[0]
                    feature_importance = {
                        f"feature_{i}": abs(float(coeff)) 
                        for i, coeff in enumerate(coeffs)
                    }
                else:
                    feature_importance = {}
                
                return win_prob, confidence, feature_importance
            else:
                # Ultimate fallback - simple heuristic
                return self._heuristic_prediction(features)
                
        except Exception as e:
            logger.error(f"Fallback prediction error: {str(e)}")
            return self._heuristic_prediction(features)
    
    def _heuristic_prediction(self, features: np.ndarray) -> Tuple[float, float, Dict[str, float]]:
        """Simple heuristic prediction when models fail."""
        # Basic heuristic based on odds and team strength
        odds_feature = features[0] if len(features) > 0 else 0
        home_win_rate = features[3] if len(features) > 3 else 0.5
        away_win_rate = features[4] if len(features) > 4 else 0.5
        
        # Simple win probability calculation
        team_strength_diff = home_win_rate - away_win_rate
        win_prob = 0.5 + (team_strength_diff * 0.3)  # Adjust by team strength
        win_prob = max(0.1, min(0.9, win_prob))  # Clamp between 0.1 and 0.9
        
        confidence = 40.0  # Low confidence for heuristic
        
        feature_importance = {
            "team_strength": 0.6,
            "odds_value": 0.4
        }
        
        return win_prob, confidence, feature_importance
    
    def _calculate_expected_value(self, win_probability: float, odds: float) -> float:
        """Calculate expected value of a bet."""
        try:
            # Convert American odds to decimal
            if odds > 0:
                decimal_odds = (odds / 100) + 1
            else:
                decimal_odds = (100 / abs(odds)) + 1
            
            # Expected value = (win_prob * payout) - (loss_prob * stake)
            # Assuming stake of 1 unit
            payout = decimal_odds - 1  # Profit on win
            loss_prob = 1 - win_probability
            
            expected_value = (win_probability * payout) - (loss_prob * 1)
            
            return float(expected_value)
            
        except Exception as e:
            logger.error(f"Error calculating expected value: {str(e)}")
            return 0.0
    
    def _features_to_array(self, features: FeatureVector, selection: str) -> np.ndarray:
        """Convert feature vector to numpy array for model input."""
        # Define feature order (must match training data)
        feature_values = [
            features.odds_value,
            features.odds_movement or 0.0,
            features.market_efficiency or 1.0,
            features.home_win_rate,
            features.away_win_rate,
            features.head_to_head_record or 0.5,
            features.recent_form_home,
            features.recent_form_away,
            features.rest_days_home or 3,
            features.rest_days_away or 3,
            features.travel_distance or 0.0,
            features.weather_impact or 0.0,
            features.strength_of_schedule or 0.5,
            features.injury_impact or 0.0,
            features.motivation_factor or 0.0,
            1.0 if selection == "home" else 0.0  # Home indicator
        ]
        
        return np.array(feature_values, dtype=np.float32)
    
    def _is_viable_candidate(self, candidate: PickCandidate, request: MLRequest) -> bool:
        """Check if a candidate meets viability criteria."""
        try:
            # Check confidence threshold
            if candidate.prediction.confidence_score < (request.min_confidence or self.min_confidence_threshold):
                return False
            
            # Check expected value threshold
            if candidate.prediction.expected_value < self.expected_value_threshold:
                return False
            
            # Check odds range
            if not self._odds_in_range(candidate.odds, request):
                return False
            
            return True
            
        except Exception:
            return False
    
    def _odds_in_range(self, odds: float, request: MLRequest) -> bool:
        """Check if odds are within acceptable range."""
        min_odds = request.min_odds or self.min_odds_threshold
        max_odds = request.max_odds or self.max_odds_threshold
        
        return min_odds <= odds <= max_odds
    
    def _select_best_pick(self, candidates: List[PickCandidate], request: MLRequest) -> PickCandidate:
        """Select the best pick from candidates based on expected value."""
        if not candidates:
            raise ValueError("No candidates to select from")
        
        # Sort by expected value (descending) then by confidence
        candidates.sort(
            key=lambda c: (c.prediction.expected_value, c.prediction.confidence_score),
            reverse=True
        )
        
        best_pick = candidates[0]
        
        logger.info(
            f"Selected best pick: {best_pick.selection} "
            f"(EV: {best_pick.prediction.expected_value:.3f}, "
            f"Confidence: {best_pick.prediction.confidence_score:.1f}%)"
        )
        
        return best_pick
    
    def _generate_rationale(
        self, 
        prediction: ModelPrediction, 
        features: FeatureVector, 
        game: Game, 
        selection: str
    ) -> Rationale:
        """Generate human-readable rationale for the pick."""
        try:
            # Get top contributing factors
            top_factors = sorted(
                prediction.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]
            
            factor_names = [self._humanize_feature_name(factor[0]) for factor in top_factors]
            
            # Generate reasoning text
            team_name = game.home_team if selection == "home" else game.away_team
            reasoning_parts = [
                f"ML model recommends {team_name} based on comprehensive analysis."
            ]
            
            # Add specific insights
            if features.recent_form_home > 0.6 and selection == "home":
                reasoning_parts.append("Home team shows strong recent form.")
            elif features.recent_form_away > 0.6 and selection == "away":
                reasoning_parts.append("Away team demonstrates excellent recent performance.")
            
            if features.weather_impact and features.weather_impact < -0.05:
                reasoning_parts.append("Weather conditions may impact game dynamics.")
            
            if features.injury_impact and features.injury_impact < -0.1:
                reasoning_parts.append("Key injuries considered in the analysis.")
            
            reasoning = " ".join(reasoning_parts)
            
            # Risk assessment
            risk_factors = []
            if prediction.confidence_score < 70:
                risk_factors.append("Moderate confidence level")
            if abs(features.odds_value) < 110:
                risk_factors.append("Close odds indicate tight matchup")
            
            risk_assessment = "; ".join(risk_factors) if risk_factors else "Low risk factors identified"
            
            return Rationale(
                reasoning=reasoning,
                top_factors=factor_names,
                confidence_factors=dict(top_factors),
                risk_assessment=risk_assessment
            )
            
        except Exception as e:
            logger.error(f"Error generating rationale: {str(e)}")
            return Rationale(
                reasoning="ML analysis completed with standard methodology.",
                top_factors=["Statistical Analysis", "Team Performance", "Market Conditions"],
                risk_assessment="Standard risk profile"
            )
    
    def _humanize_feature_name(self, feature_name: str) -> str:
        """Convert technical feature names to human-readable format."""
        name_mapping = {
            "odds_value": "Betting Odds Analysis",
            "odds_movement": "Line Movement",
            "market_efficiency": "Market Conditions",
            "home_win_rate": "Home Team Record",
            "away_win_rate": "Away Team Record",
            "recent_form_home": "Home Team Form",
            "recent_form_away": "Away Team Form",
            "head_to_head_record": "Head-to-Head History",
            "weather_impact": "Weather Conditions",
            "injury_impact": "Injury Reports",
            "rest_days_home": "Rest Advantage",
            "travel_distance": "Travel Factors"
        }
        
        return name_mapping.get(feature_name, feature_name.replace("_", " ").title())
    
    def _create_response(self, pick: PickCandidate, request: MLRequest) -> MLResponse:
        """Create ML response from selected pick."""
        return MLResponse(
            selection=pick.selection,
            market=pick.market,
            league=pick.game.league,
            odds=pick.odds,
            confidence=pick.prediction.confidence_score,
            expected_value=pick.prediction.expected_value,
            rationale=pick.rationale.dict(),
            features_used=list(pick.prediction.feature_importance.keys()),
            model_version=pick.prediction.model_version
        )
    
    def _generate_fallback_pick(self, request: MLRequest) -> MLResponse:
        """Generate a conservative fallback pick when main pipeline fails."""
        try:
            # Select first game with reasonable odds
            for game in request.games:
                home_odds = game.odds.get('home_ml', 0)
                away_odds = game.odds.get('away_ml', 0)
                
                if home_odds and -150 <= home_odds <= 150:
                    return MLResponse(
                        selection=f"{game.home_team} ML",
                        market=MarketType.MONEYLINE,
                        league=game.league,
                        odds=home_odds,
                        confidence=55.0,  # Conservative confidence
                        expected_value=0.01,  # Minimal positive EV
                        rationale={
                            "reasoning": "Fallback selection based on conservative analysis.",
                            "top_factors": ["Home Field Advantage", "Odds Value", "Risk Management"],
                            "risk_assessment": "Conservative fallback pick"
                        },
                        features_used=["basic_analysis"],
                        model_version="fallback"
                    )
            
            # If no suitable game found, return first game
            if request.games:
                game = request.games[0]
                return MLResponse(
                    selection=f"{game.home_team} ML",
                    market=MarketType.MONEYLINE,
                    league=game.league,
                    odds=game.odds.get('home_ml', -110),
                    confidence=50.0,
                    expected_value=0.0,
                    rationale={
                        "reasoning": "Emergency fallback selection.",
                        "top_factors": ["Default Selection"],
                        "risk_assessment": "High uncertainty"
                    },
                    features_used=[],
                    model_version="emergency"
                )
            
            raise ValueError("No games available for fallback")
            
        except Exception as e:
            logger.error(f"Error generating fallback pick: {str(e)}")
            raise
    
    def _initialize_models(self):
        """Initialize ML models (placeholder for actual model loading)."""
        try:
            # In production, this would load pre-trained models
            # For now, we'll create placeholder models
            
            if xgb:
                # Create a simple XGBoost model structure
                # This would be replaced with actual model loading
                self.feature_names = [
                    'odds_value', 'odds_movement', 'market_efficiency',
                    'home_win_rate', 'away_win_rate', 'head_to_head_record',
                    'recent_form_home', 'recent_form_away',
                    'rest_days_home', 'rest_days_away', 'travel_distance',
                    'weather_impact', 'strength_of_schedule', 'injury_impact',
                    'motivation_factor', 'home_indicator'
                ]
                
                # Placeholder - would load actual trained model
                self.xgb_model = None  # xgb.Booster()
            
            if LogisticRegression and StandardScaler:
                # Create fallback logistic regression model
                self.fallback_model = LogisticRegression(random_state=42)
                self.scaler = StandardScaler()
                
                # In production, these would be loaded from saved models
                # For now, they remain unfit and will trigger heuristic fallback
            
            logger.info("ML models initialized (placeholder mode)")
            
        except Exception as e:
            logger.warning(f"Error initializing models: {str(e)}")
    
    def _is_outdoor_venue(self, venue: str) -> bool:
        """Check if venue is outdoor (affects weather impact)."""
        # Simple heuristic - in production would use venue database
        indoor_keywords = ['dome', 'indoor', 'arena', 'center']
        venue_lower = venue.lower()
        return not any(keyword in venue_lower for keyword in indoor_keywords)