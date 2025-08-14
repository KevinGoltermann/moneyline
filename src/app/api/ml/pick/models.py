"""
Pydantic data models for ML service input/output.

These models define the structure for API requests and responses,
ensuring type safety and validation for the ML prediction pipeline.
"""

from pydantic import BaseModel, Field, validator
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
    
    home_team: str = Field(..., description="Home team name")
    away_team: str = Field(..., description="Away team name")
    league: League = Field(..., description="Sports league")
    start_time: datetime = Field(..., description="Game start time")
    
    # Odds data
    odds: Dict[str, float] = Field(
        ..., 
        description="Betting odds by market (e.g., {'home_ml': -110, 'away_ml': +120})"
    )
    
    # Optional contextual data
    venue: Optional[str] = Field(None, description="Game venue/stadium")
    weather: Optional[Dict[str, Any]] = Field(None, description="Weather conditions")
    injuries: Optional[List[str]] = Field(None, description="Key injury reports")
    
    @validator('odds')
    def validate_odds(cls, v):
        """Ensure odds are in valid American format."""
        for market, odds_value in v.items():
            if not isinstance(odds_value, (int, float)):
                raise ValueError(f"Odds value for {market} must be numeric")
            if odds_value == 0:
                raise ValueError(f"Odds value for {market} cannot be zero")
        return v


class MLRequest(BaseModel):
    """Request model for ML pick generation."""
    
    date: date = Field(..., description="Date for pick generation")
    games: List[Game] = Field(..., min_items=1, description="Available games for analysis")
    
    # Optional context data
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context data (team stats, trends, etc.)"
    )
    
    # Configuration options
    min_odds: Optional[int] = Field(-200, description="Minimum odds threshold")
    max_odds: Optional[int] = Field(300, description="Maximum odds threshold")
    min_confidence: Optional[float] = Field(60.0, ge=0.0, le=100.0, description="Minimum confidence threshold")
    
    @validator('games')
    def validate_games_not_empty(cls, v):
        """Ensure at least one game is provided."""
        if not v:
            raise ValueError("At least one game must be provided")
        return v


class MLResponse(BaseModel):
    """Response model for ML pick generation."""
    
    # Pick details
    selection: str = Field(..., description="Selected team/outcome")
    market: MarketType = Field(..., description="Betting market type")
    league: League = Field(..., description="Sports league")
    odds: float = Field(..., description="Odds for the selection")
    
    # ML analysis results
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=100.0, 
        description="Confidence percentage (0-100)"
    )
    expected_value: Optional[float] = Field(
        None,
        description="Calculated expected value"
    )
    
    # Explanation and context
    rationale: Dict[str, Any] = Field(..., description="ML decision explanation")
    features_used: List[str] = Field(
        ...,
        description="List of features used in the analysis"
    )
    
    # Metadata
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when pick was generated"
    )
    model_version: Optional[str] = Field(
        "1.0.0",
        description="ML model version used"
    )


class FeatureVector(BaseModel):
    """Processed feature vector for ML model input."""
    
    # Odds-based features
    odds_value: float
    odds_movement: Optional[float] = None
    market_efficiency: Optional[float] = None
    
    # Team performance features
    home_win_rate: float
    away_win_rate: float
    head_to_head_record: Optional[float] = None
    recent_form_home: float
    recent_form_away: float
    
    # Contextual features
    rest_days_home: Optional[int] = None
    rest_days_away: Optional[int] = None
    travel_distance: Optional[float] = None
    weather_impact: Optional[float] = None
    
    # Advanced metrics
    strength_of_schedule: Optional[float] = None
    injury_impact: Optional[float] = None
    motivation_factor: Optional[float] = None


class ModelPrediction(BaseModel):
    """ML model prediction output."""
    
    win_probability: float = Field(..., ge=0.0, le=1.0, description="Predicted win probability")
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Model confidence (0-100)")
    expected_value: float = Field(..., description="Expected value of the bet")
    feature_importance: Dict[str, float] = Field(..., description="Feature importance scores")
    model_version: str = Field(default="1.0.0", description="Model version used")


class Rationale(BaseModel):
    """ML decision rationale and explanation."""
    
    reasoning: str = Field(..., description="Human-readable explanation of the pick")
    top_factors: List[str] = Field(
        ..., 
        min_items=1,
        description="Top contributing factors to the decision"
    )
    confidence_factors: Optional[Dict[str, float]] = Field(
        None,
        description="Factor importance scores"
    )
    risk_assessment: Optional[str] = Field(
        None,
        description="Risk factors and considerations"
    )


class PickCandidate(BaseModel):
    """Candidate pick with analysis results."""
    
    game: Game
    selection: str  # "home" or "away"
    market: MarketType
    odds: float
    prediction: ModelPrediction
    rationale: Rationale


class TeamStats(BaseModel):
    """Team performance statistics."""
    
    team_name: str
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    win_percentage: float = Field(ge=0.0, le=1.0)
    
    # Recent form (last 5-10 games)
    recent_form: List[str] = Field(
        default_factory=list,
        description="Recent game results as ['W', 'L', 'W', ...]"
    )
    
    # Advanced metrics
    points_per_game: Optional[float] = Field(None, ge=0)
    points_allowed_per_game: Optional[float] = Field(None, ge=0)
    home_record: Optional[str] = Field(None, description="Home win-loss record")
    away_record: Optional[str] = Field(None, description="Away win-loss record")


class ExternalAPIError(BaseModel):
    """Error response from external APIs."""
    
    api_name: str
    error_code: str
    error_message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")