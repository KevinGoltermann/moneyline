#!/usr/bin/env node

/**
 * Direct test of our external API function to see if it picks up MLB games
 */

// Simple test without dependencies
const ODDS_API_KEY = process.env.ODDS_API_KEY || '4933731e3989153478381de56d70f421';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'c233456f78bfec2d930fc1c70732a6c4';

async function testExternalAPIFunction() {
  console.log('Testing External API Function with Real Data');
  console.log('===========================================');
  
  const today = '2025-08-12';
  console.log(`Testing for date: ${today}`);
  
  try {
    // Simulate our external API function logic
    const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
    const SUPPORTED_SPORTS = {
      NFL: 'americanfootball_nfl',
      NBA: 'basketball_nba', 
      MLB: 'baseball_mlb',
      NHL: 'icehockey_nhl'
    };
    
    const games = [];
    
    // Test MLB specifically
    console.log('\nFetching MLB games...');
    const url = `${ODDS_API_BASE_URL}/sports/baseball_mlb/odds`;
    const params = new URLSearchParams({
      apiKey: ODDS_API_KEY,
      regions: 'us',
      markets: 'h2h',
      oddsFormat: 'american',
      dateFormat: 'iso'
    });
    
    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      console.error(`MLB API error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`Total MLB games from API: ${data.length}`);
    
    // Test our date filtering logic (fixed version)
    const targetDate = new Date(today + 'T00:00:00Z');
    const dayStart = new Date(targetDate);
    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);
    
    console.log(`Date range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);
    
    let filteredCount = 0;
    for (const game of data) {
      const gameTime = new Date(game.commence_time);
      
      if (gameTime >= dayStart && gameTime <= dayEnd) {
        filteredCount++;
        
        if (filteredCount <= 3) {
          console.log(`Game ${filteredCount}: ${game.away_team} @ ${game.home_team} at ${gameTime.toISOString()}`);
          
          // Test odds extraction
          let homeOdds = null;
          let awayOdds = null;
          
          for (const bookmaker of game.bookmakers) {
            const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
            if (h2hMarket) {
              const homeOutcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
              const awayOutcome = h2hMarket.outcomes.find(o => o.name === game.away_team);
              
              if (homeOutcome && awayOutcome) {
                homeOdds = homeOutcome.price;
                awayOdds = awayOutcome.price;
                break;
              }
            }
          }
          
          if (homeOdds && awayOdds) {
            console.log(`  Odds: ${game.home_team} ${homeOdds}, ${game.away_team} ${awayOdds}`);
            
            // Test weather for this game
            const teamCityMap = {
              'Baltimore Orioles': 'Baltimore',
              'Cincinnati Reds': 'Cincinnati',
              'Cleveland Guardians': 'Cleveland'
            };
            
            const city = teamCityMap[game.home_team];
            if (city) {
              try {
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=imperial`;
                const weatherResponse = await fetch(weatherUrl);
                
                if (weatherResponse.ok) {
                  const weatherData = await weatherResponse.json();
                  console.log(`  Weather in ${city}: ${weatherData.main.temp}°F, ${weatherData.weather[0].description}`);
                }
              } catch (error) {
                console.log(`  Weather fetch failed for ${city}`);
              }
            }
            
            games.push({
              home_team: game.home_team,
              away_team: game.away_team,
              league: 'MLB',
              start_time: game.commence_time,
              odds: {
                home_ml: homeOdds,
                away_ml: awayOdds
              }
            });
          }
        }
      }
    }
    
    console.log(`\nFiltered games for ${today}: ${filteredCount}`);
    console.log(`Converted games: ${games.length}`);
    
    if (games.length > 0) {
      console.log('\n✅ SUCCESS: External API function would return MLB games!');
      console.log('Sample converted game:');
      console.log(JSON.stringify(games[0], null, 2));
    } else {
      console.log('\n❌ ISSUE: No games passed the filtering/conversion process');
    }
    
  } catch (error) {
    console.error('Error testing external API function:', error);
  }
}

testExternalAPIFunction();