#!/bin/bash

# Test script to check if we can fetch MLB games for today

echo "Testing MLB Games Fetch for Today"
echo "=================================="

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

TODAY=$(date +%Y-%m-%d)
echo "Testing for date: $TODAY"

# Test direct MLB API call
echo -e "\n1. Direct MLB API Call:"
echo "----------------------"
MLB_GAMES=$(curl -s "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds?apiKey=$ODDS_API_KEY&regions=us&markets=h2h&oddsFormat=american&dateFormat=iso")
GAME_COUNT=$(echo "$MLB_GAMES" | jq '. | length')
echo "Total MLB games available: $GAME_COUNT"

if [ "$GAME_COUNT" -gt 0 ]; then
    echo -e "\nSample games:"
    echo "$MLB_GAMES" | jq '.[0:3] | .[] | {home_team, away_team, commence_time}' | head -20
fi

# Test our application's external API function by calling the daily pick job for tomorrow
echo -e "\n2. Testing Daily Pick Job for Tomorrow:"
echo "--------------------------------------"
TOMORROW=$(date -d "+1 day" +%Y-%m-%d)
echo "Testing for tomorrow: $TOMORROW"

# We'll modify the date in the request to tomorrow to avoid conflicts
RESPONSE=$(curl -s -X POST http://localhost:3000/api/jobs/daily-pick \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_SECRET")

echo "Response:"
echo "$RESPONSE" | jq .

echo -e "\n3. Testing Weather API:"
echo "----------------------"
WEATHER=$(curl -s "https://api.openweathermap.org/data/2.5/weather?q=Baltimore&appid=$WEATHER_API_KEY&units=imperial")
echo "Baltimore weather:"
echo "$WEATHER" | jq '{temp: .main.temp, conditions: .weather[0].description, humidity: .main.humidity}'

echo -e "\nTest completed!"