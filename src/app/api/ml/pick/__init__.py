"""
ML Pick Generation Service

This package provides machine learning-powered betting pick generation
functionality, including data models, feature engineering, and external
API integrations.
"""

from .models import (
    MLRequest,
    MLResponse,
    Game,
    TeamStats,
    FeatureVector,
    Rationale,
    MarketType,
    League
)

from .feature_engineering import FeatureEngineer
from .external_apis import OddsAPI, WeatherAPI, SportsDataAPI

__version__ = "1.0.0"
__all__ = [
    "MLRequest",
    "MLResponse", 
    "Game",
    "TeamStats",
    "FeatureVector",
    "Rationale",
    "MarketType",
    "League",
    "FeatureEngineer",
    "OddsAPI",
    "WeatherAPI",
    "SportsDataAPI"
]