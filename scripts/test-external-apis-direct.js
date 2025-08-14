#!/usr/bin/env node

/**
 * Direct test of external APIs without the full pipeline
 * This tests the raw API connectivity and data structure
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

async function testOddsAPIDirect() {
  logSection('Testing Odds API Direct Connection');
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY;
  const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
  
  if (!ODDS_API_KEY) {
    log('✗ ODDS_API_KEY not found in environment', 'red');
    return;
  }
  
  log(`✓ ODDS_API_KEY found: ${ODDS_API_KEY.substring(0, 8)}...`, 'green');
  
  try {
    // Test 1: Get available sports
    log('Testing available sports endpoint...', 'blue');
    const sportsUrl = `${ODDS_API_BASE_URL}/sports?apiKey=${ODDS_API_KEY}`;
    const sportsResponse = await fetch(sportsUrl);
    
    if (sportsResponse.ok) {
      const sports = await sportsResponse.json();
      log(`✓ Sports API working - found ${sports.length} sports`, 'green');
      
      // Show active sports
      const activeSports = sports.filter(s => s.active);
      log(`Active sports: ${activeSports.map(s => s.key).join(', ')}`, 'blue');
      
      // Test 2: Get odds for an active sport
      if (activeSports.length > 0) {
        const testSport = activeSports[0];
        log(`\nTesting odds for ${testSport.title} (${testSport.key})...`, 'blue');
        
        const oddsUrl = `${ODDS_API_BASE_URL}/sports/${testSport.key}/odds`;
        const params = new URLSearchParams({
          apiKey: ODDS_API_KEY,
          regions: 'us',
          markets: 'h2h',
          oddsFormat: 'american',
          dateFormat: 'iso'
        });
        
        const oddsResponse = await fetch(`${oddsUrl}?${params}`);
        
        if (oddsResponse.ok) {
          const games = await oddsResponse.json();
          log(`✓ Odds API working - found ${games.length} games for ${testSport.title}`, 'green');
          
          if (games.length > 0) {
            const game = games[0];
            console.log('\nSample game data:');
            console.log(JSON.stringify({
              id: game.id,
              sport: game.sport_title,
              commence_time: game.commence_time,
              home_team: game.home_team,
              away_team: game.away_team,
              bookmakers_count: game.bookmakers?.length || 0,
              sample_odds: game.bookmakers?.[0]?.markets?.[0]?.outcomes || []
            }, null, 2));
            
            // Validate game structure
            const requiredFields = ['id', 'home_team', 'away_team', 'commence_time'];
            const missingFields = requiredFields.filter(field => !game[field]);
            
            if (missingFields.length === 0) {
              log('✓ Game data structure is valid', 'green');
            } else {
              log(`✗ Missing fields: ${missingFields.join(', ')}`, 'red');
            }
            
            // Check odds availability
            if (game.bookmakers && game.bookmakers.length > 0) {
              log(`✓ Odds available from ${game.bookmakers.length} bookmakers`, 'green');
            } else {
              log('⚠ No odds data available', 'yellow');
            }
          } else {
            log('⚠ No games found (may be off-season)', 'yellow');
          }
        } else {
          log(`✗ Odds API error: ${oddsResponse.status}`, 'red');
          const errorText = await oddsResponse.text();
          console.log('Error response:', errorText);
        }
      }
      
    } else {
      log(`✗ Sports API error: ${sportsResponse.status}`, 'red');
      const errorText = await sportsResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    log(`✗ Error testing Odds API: ${error.message}`, 'red');
  }
}

async function testWeatherAPIDirect() {
  logSection('Testing Weather API Direct Connection');
  
  const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
  const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
  
  if (!WEATHER_API_KEY) {
    log('✗ WEATHER_API_KEY not found in environment', 'red');
    return;
  }
  
  log(`✓ WEATHER_API_KEY found: ${WEATHER_API_KEY.substring(0, 8)}...`, 'green');
  
  try {
    // Test weather API with a known city
    log('Testing weather API with New York...', 'blue');
    const weatherUrl = `${WEATHER_API_BASE_URL}/weather`;
    const params = new URLSearchParams({
      q: 'New York,NY',
      appid: WEATHER_API_KEY,
      units: 'imperial'
    });
    
    const response = await fetch(`${weatherUrl}?${params}`);
    
    if (response.ok) {
      const weather = await response.json();
      log('✓ Weather API working', 'green');
      
      console.log('\nSample weather data:');
      console.log(JSON.stringify({
        city: weather.name,
        temperature: weather.main.temp,
        conditions: weather.weather[0].description,
        humidity: weather.main.humidity,
        wind_speed: weather.wind.speed,
        wind_direction: weather.wind.deg
      }, null, 2));
      
      // Validate weather structure
      const requiredFields = ['main', 'weather', 'wind'];
      const missingFields = requiredFields.filter(field => !weather[field]);
      
      if (missingFields.length === 0) {
        log('✓ Weather data structure is valid', 'green');
      } else {
        log(`✗ Missing fields: ${missingFields.join(', ')}`, 'red');
      }
      
    } else {
      log(`✗ Weather API error: ${response.status}`, 'red');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    log(`✗ Error testing Weather API: ${error.message}`, 'red');
  }
}

async function testAPIRateLimits() {
  logSection('Testing API Rate Limits and Usage');
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY;
  
  if (!ODDS_API_KEY) {
    log('✗ Cannot test rate limits without ODDS_API_KEY', 'red');
    return;
  }
  
  try {
    // Make a request to check remaining quota
    const response = await fetch(`https://api.the-odds-api.com/v4/sports?apiKey=${ODDS_API_KEY}`);
    
    if (response.ok) {
      const remainingRequests = response.headers.get('x-requests-remaining');
      const usedRequests = response.headers.get('x-requests-used');
      
      if (remainingRequests) {
        log(`✓ API requests remaining: ${remainingRequests}`, 'green');
      }
      if (usedRequests) {
        log(`Used requests: ${usedRequests}`, 'blue');
      }
      
      if (parseInt(remainingRequests) < 100) {
        log('⚠ Low API quota remaining - consider usage optimization', 'yellow');
      }
      
    } else {
      log('⚠ Could not check API rate limits', 'yellow');
    }
    
  } catch (error) {
    log(`✗ Error checking rate limits: ${error.message}`, 'red');
  }
}

async function runDirectTests() {
  log('Starting Direct External API Tests', 'bold');
  log('This tests raw API connectivity without the application layer\n', 'blue');
  
  await testOddsAPIDirect();
  await testWeatherAPIDirect();
  await testAPIRateLimits();
  
  logSection('Direct API Test Summary');
  log('Direct API testing completed!', 'bold');
  log('These tests validate the raw API connections work correctly.', 'blue');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runDirectTests().catch(error => {
    console.error('Direct API test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runDirectTests,
  testOddsAPIDirect,
  testWeatherAPIDirect,
  testAPIRateLimits
};