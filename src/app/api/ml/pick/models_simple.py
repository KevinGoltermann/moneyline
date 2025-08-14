"""
Simplified Pydantic data models for ML service input/output.
This version removes validators to avoid recursion issues.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime, date
from enum import Enum


class MarketType(str, Enum):
    """Supported betting market types."""
    MONEYLINE = "moneyline"
    SPREAD = "spread"
    TOTAL = "total"


class League(str, Enum):
    """Supported sports leagues."""
    NFL = "NFL"
    NBA = "NBA"
    MLB = "MLB"
    NHL = "NHL"


class Game(BaseModel):
    """Individual game data for ML analysis."""
    
    home_team: str
    away_team: str
    league: League
    start_time: str  # Use string instead of datetime to avoid issues
    odds: Dict[str, float]
    venue: Optional[str] = None
    weather: Optional[Dict[str, Any]] = None
    injuries: Optional[List[str]] = None


class MLRequest(BaseModel):
    """Request model for ML pick generation."""
    
    date: str  # Use string instead of date
    games: List[Game]
    context: Dict[str, Any] = {}
    min_odds: Optional[int] = -200
    max_odds: Optional[int] = 300
    min_confidence: Optional[float] = 60.0


class MLResponse(BaseModel):
    """Response model for ML pick generation."""
    
    selection: str
    market: MarketType
    league: League
    odds: float
    confidence: float
    expected_value: Optional[float] = None
    rationale: Dict[str, Any]
    features_used: List[str]
    generated_at: str  # Use string instead of datetime
    model_version: Optional[str] = "2.0.0"


class FeatureVector(BaseModel):
    """Processed feature vector for ML model input."""
    
    # Basic odds and market features
    odds_value: float
    odds_movement: Optional[float] = None
    market_efficiency: Optional[float] = None
    
    # Basic team performance
    home_win_rate: float
    away_win_rate: float
    head_to_head_record: Optional[float] = None
    recent_form_home: float
    recent_form_away: float
    
    # Advanced efficiency metrics
    home_offensive_rating: Optional[float] = None
    home_defensive_rating: Optional[float] = None
    home_net_rating: Optional[float] = None
    home_pace: Optional[float] = None
    away_offensive_rating: Optional[float] = None
    away_defensive_rating: Optional[float] = None
    away_net_rating: Optional[float] = None
    away_pace: Optional[float] = None
    
    # Matchup advantages
    offensive_matchup_advantage: Optional[float] = None
    defensive_matchup_advantage: Optional[float] = None
    pace_differential: Optional[float] = None
    
    # Advanced form metrics
    home_form_weighted: Optional[float] = None
    home_form_vs_quality: Optional[float] = None
    away_form_weighted: Optional[float] = None
    away_form_vs_quality: Optional[float] = None
    home_form_trend: Optional[float] = None
    away_form_trend: Optional[float] = None
    
    # Strength of schedule
    home_sos_past: Optional[float] = None
    away_sos_past: Optional[float] = None
    home_sos_future: Optional[float] = None
    away_sos_future: Optional[float] = None
    home_record_vs_quality: Optional[float] = None
    away_record_vs_quality: Optional[float] = None
    
    # Contextual features
    rest_days_home: Optional[int] = None
    rest_days_away: Optional[int] = None
    travel_distance: Optional[float] = None
    weather_impact: Optional[float] = None
    
    # Advanced situational metrics
    fatigue_factor_home: Optional[float] = None
    fatigue_factor_away: Optional[float] = None
    timezone_adjustment: Optional[float] = None
    altitude_adjustment: Optional[float] = None
    
    # Injury and depth analysis
    injury_impact: Optional[float] = None
    depth_chart_impact: Optional[float] = None
    
    # Motivation and psychological factors
    motivation_factor: Optional[float] = None
    revenge_game_factor: Optional[float] = None
    playoff_implications: Optional[float] = None
    
    # Market and betting factors
    sharp_money_indicator: Optional[float] = None
    public_betting_percentage: Optional[float] = None
    line_movement_significance: Optional[float] = None


class ModelPrediction(BaseModel):
    """ML model prediction output."""
    
    win_probability: float
    confidence_score: float
    expected_value: float
    feature_importance: Dict[str, float]
    model_version: str = "2.0.0"


class Rationale(BaseModel):
    """ML decision rationale and explanation."""
    
    reasoning: str
    top_factors: List[str]
    confidence_factors: Optional[Dict[str, float]] = None
    risk_assessment: Optional[str] = None


class PickCandidate(BaseModel):
    """Candidate pick with analysis results."""
    
    game: Game
    selection: str
    market: MarketType
    odds: float
    prediction: ModelPrediction
    rationale: Rationale


class TeamStats(BaseModel):
    """Team performance statistics."""
    
    team_name: str
    wins: int = 0
    losses: int = 0
    win_percentage: float = 0.5
    recent_form: List[str] = []
    points_per_game: Optional[float] = None
    points_allowed_per_game: Optional[float] = None
    home_record: Optional[str] = None
    away_record: Optional[str] = None


class ExternalAPIError(BaseModel):
    """Error response from external APIs."""
    
    api_name: str
    error_code: str
    error_message: str
    timestamp: str
    retry_after: Optional[int] = None