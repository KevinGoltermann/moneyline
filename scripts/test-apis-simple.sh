#!/bin/bash

# Simple API testing script using curl
# This tests the external APIs directly with curl commands

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Testing External APIs with Real Data${NC}"
echo "=============================================="

# Test 1: Check environment variables
echo -e "\n${BOLD}1. Checking Environment Variables${NC}"
echo "----------------------------------------"

if [ -z "$ODDS_API_KEY" ]; then
    echo -e "${RED}✗ ODDS_API_KEY not found${NC}"
else
    echo -e "${GREEN}✓ ODDS_API_KEY found: ${ODDS_API_KEY:0:8}...${NC}"
fi

if [ -z "$WEATHER_API_KEY" ]; then
    echo -e "${RED}✗ WEATHER_API_KEY not found${NC}"
else
    echo -e "${GREEN}✓ WEATHER_API_KEY found: ${WEATHER_API_KEY:0:8}...${NC}"
fi

# Test 2: Test Odds API
echo -e "\n${BOLD}2. Testing Odds API${NC}"
echo "----------------------------------------"

if [ -n "$ODDS_API_KEY" ]; then
    echo -e "${BLUE}Testing sports endpoint...${NC}"
    
    SPORTS_RESPONSE=$(curl -s "https://api.the-odds-api.com/v4/sports?apiKey=$ODDS_API_KEY")
    
    if echo "$SPORTS_RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ Odds API error:${NC}"
        echo "$SPORTS_RESPONSE" | head -3
    else
        SPORTS_COUNT=$(echo "$SPORTS_RESPONSE" | grep -o '"key"' | wc -l)
        echo -e "${GREEN}✓ Odds API working - found $SPORTS_COUNT sports${NC}"
        
        # Get active sports
        echo -e "${BLUE}Active sports:${NC}"
        echo "$SPORTS_RESPONSE" | grep -o '"key":"[^"]*"' | head -5
        
        # Test odds for NFL (if available)
        echo -e "\n${BLUE}Testing NFL odds...${NC}"
        NFL_RESPONSE=$(curl -s "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=$ODDS_API_KEY&regions=us&markets=h2h&oddsFormat=american")
        
        if echo "$NFL_RESPONSE" | grep -q "error"; then
            echo -e "${YELLOW}⚠ NFL odds not available (may be off-season)${NC}"
        else
            GAMES_COUNT=$(echo "$NFL_RESPONSE" | grep -o '"id"' | wc -l)
            echo -e "${GREEN}✓ Found $GAMES_COUNT NFL games${NC}"
            
            if [ "$GAMES_COUNT" -gt 0 ]; then
                echo -e "${BLUE}Sample game:${NC}"
                echo "$NFL_RESPONSE" | head -10
            fi
        fi
        
        # Check API usage
        REMAINING=$(curl -s -I "https://api.the-odds-api.com/v4/sports?apiKey=$ODDS_API_KEY" | grep -i "x-requests-remaining" | cut -d' ' -f2 | tr -d '\r')
        if [ -n "$REMAINING" ]; then
            echo -e "${BLUE}API requests remaining: $REMAINING${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Cannot test Odds API - no API key${NC}"
fi

# Test 3: Test Weather API
echo -e "\n${BOLD}3. Testing Weather API${NC}"
echo "----------------------------------------"

if [ -n "$WEATHER_API_KEY" ]; then
    echo -e "${BLUE}Testing weather for New York...${NC}"
    
    WEATHER_RESPONSE=$(curl -s "https://api.openweathermap.org/data/2.5/weather?q=New%20York,NY&appid=$WEATHER_API_KEY&units=imperial")
    
    if echo "$WEATHER_RESPONSE" | grep -q "error\|cod.*40"; then
        echo -e "${RED}✗ Weather API error:${NC}"
        echo "$WEATHER_RESPONSE" | head -3
    else
        echo -e "${GREEN}✓ Weather API working${NC}"
        
        # Extract key weather data
        TEMP=$(echo "$WEATHER_RESPONSE" | grep -o '"temp":[0-9.]*' | cut -d':' -f2)
        CONDITIONS=$(echo "$WEATHER_RESPONSE" | grep -o '"description":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        HUMIDITY=$(echo "$WEATHER_RESPONSE" | grep -o '"humidity":[0-9]*' | cut -d':' -f2)
        
        echo -e "${BLUE}Temperature: ${TEMP}°F${NC}"
        echo -e "${BLUE}Conditions: $CONDITIONS${NC}"
        echo -e "${BLUE}Humidity: ${HUMIDITY}%${NC}"
    fi
else
    echo -e "${RED}✗ Cannot test Weather API - no API key${NC}"
fi

# Test 4: Test Application Endpoints
echo -e "\n${BOLD}4. Testing Application Endpoints${NC}"
echo "----------------------------------------"

echo -e "${BLUE}Testing /api/today endpoint...${NC}"
TODAY_RESPONSE=$(curl -s http://localhost:3000/api/today)

if echo "$TODAY_RESPONSE" | grep -q "error"; then
    echo -e "${YELLOW}⚠ No pick available for today (expected)${NC}"
    echo "$TODAY_RESPONSE"
else
    echo -e "${GREEN}✓ Today endpoint working${NC}"
    echo "$TODAY_RESPONSE"
fi

# Test 5: Test ML Pipeline
echo -e "\n${BOLD}5. Testing ML Pipeline${NC}"
echo "----------------------------------------"

echo -e "${BLUE}Testing ML pick generation...${NC}"
TODAY_DATE=$(date +%Y-%m-%d)

ML_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ml/pick \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$TODAY_DATE\",\"min_confidence\":60,\"min_odds\":-200,\"max_odds\":200}")

if echo "$ML_RESPONSE" | grep -q "error"; then
    echo -e "${YELLOW}⚠ ML pipeline response:${NC}"
    echo "$ML_RESPONSE"
else
    echo -e "${GREEN}✓ ML pipeline working${NC}"
    echo "$ML_RESPONSE" | head -10
fi

echo -e "\n${BOLD}API Testing Complete!${NC}"
echo "=============================================="
echo -e "${BLUE}Summary: Check the results above to identify any issues.${NC}"
echo -e "${BLUE}If APIs are working, you can proceed with generating picks.${NC}"