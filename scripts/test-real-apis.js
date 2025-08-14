#!/usr/bin/env node

/**
 * Test script to validate real API integration and end-to-end functionality
 * This script tests the complete pipeline with actual API data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
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

async function testExternalAPIs() {
  logSection('Testing External API Connectivity');
  
  try {
    // Test the external APIs health check
    const response = await fetch('http://localhost:3000/api/ml/pick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'health_check'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      log('✓ API endpoint accessible', 'green');
      console.log('Health check result:', result);
    } else {
      log('✗ API endpoint not accessible', 'red');
      console.log('Response status:', response.status);
    }
  } catch (error) {
    log('✗ Error testing API endpoint: ' + error.message, 'red');
  }
}

async function testOddsAPI() {
  logSection('Testing Odds API Integration');
  
  try {
    // Import the external APIs module
    const { fetchGamesFromOddsAPI, checkExternalAPIsHealth } = require('../src/lib/external-apis.ts');
    
    // Test API health
    log('Checking API health...', 'blue');
    const health = await checkExternalAPIsHealth();
    console.log('API Health Status:', health);
    
    if (health.odds_api === 'available') {
      log('✓ Odds API is available', 'green');
      
      // Test fetching games for today
      const today = new Date().toISOString().split('T')[0];
      log(`Fetching games for ${today}...`, 'blue');
      
      const games = await fetchGamesFromOddsAPI(today);
      log(`✓ Retrieved ${games.length} games`, 'green');
      
      if (games.length > 0) {
        console.log('\nSample game data:');
        console.log(JSON.stringify(games[0], null, 2));
        
        // Validate game structure
        const game = games[0];
        const requiredFields = ['home_team', 'away_team', 'league', 'start_time', 'odds'];
        const missingFields = requiredFields.filter(field => !game[field]);
        
        if (missingFields.length === 0) {
          log('✓ Game data structure is valid', 'green');
        } else {
          log(`✗ Missing fields in game data: ${missingFields.join(', ')}`, 'red');
        }
        
        // Check odds structure
        if (game.odds && (game.odds.home_ml || game.odds.away_ml)) {
          log('✓ Odds data is present', 'green');
        } else {
          log('✗ Odds data is missing or invalid', 'red');
        }
        
        // Check weather data for outdoor games
        if (game.weather) {
          log('✓ Weather data is included', 'green');
          console.log('Weather:', game.weather);
        } else if (game.league === 'NFL' || game.league === 'MLB') {
          log('⚠ Weather data missing for outdoor sport', 'yellow');
        }
      } else {
        log('⚠ No games found for today (may be off-season)', 'yellow');
      }
    } else {
      log('✗ Odds API is not available', 'red');
    }
    
    if (health.weather_api === 'available') {
      log('✓ Weather API is available', 'green');
    } else {
      log('✗ Weather API is not available', 'red');
    }
    
  } catch (error) {
    log('✗ Error testing Odds API: ' + error.message, 'red');
    console.error(error);
  }
}

async function testMLPipeline() {
  logSection('Testing ML Pipeline with Real Data');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Test the ML pick endpoint with real data
    log('Testing ML pick generation...', 'blue');
    
    const response = await fetch('http://localhost:3000/api/ml/pick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: today,
        min_confidence: 60,
        min_odds: -200,
        max_odds: 200
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      log('✓ ML pipeline executed successfully', 'green');
      
      console.log('\nML Response:');
      console.log(JSON.stringify(result, null, 2));
      
      // Validate response structure
      const requiredFields = ['selection', 'market', 'league', 'odds', 'confidence'];
      const missingFields = requiredFields.filter(field => result[field] === undefined);
      
      if (missingFields.length === 0) {
        log('✓ ML response structure is valid', 'green');
      } else {
        log(`✗ Missing fields in ML response: ${missingFields.join(', ')}`, 'red');
      }
      
      // Check confidence level
      if (result.confidence >= 60) {
        log(`✓ Confidence level meets threshold: ${result.confidence}%`, 'green');
      } else {
        log(`⚠ Low confidence level: ${result.confidence}%`, 'yellow');
      }
      
      // Check expected value
      if (result.expected_value > 0) {
        log(`✓ Positive expected value: ${result.expected_value}`, 'green');
      } else {
        log(`⚠ Non-positive expected value: ${result.expected_value}`, 'yellow');
      }
      
    } else {
      const errorText = await response.text();
      log('✗ ML pipeline failed', 'red');
      console.log('Response status:', response.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    log('✗ Error testing ML pipeline: ' + error.message, 'red');
    console.error(error);
  }
}

async function testDailyPickJob() {
  logSection('Testing Daily Pick Job');
  
  try {
    log('Testing daily pick job endpoint...', 'blue');
    
    const response = await fetch('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      log('✓ Daily pick job executed successfully', 'green');
      
      console.log('\nDaily Pick Result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if pick was saved to database
      if (result.pick_id) {
        log('✓ Pick saved to database', 'green');
      } else {
        log('⚠ Pick may not have been saved to database', 'yellow');
      }
      
    } else {
      const errorText = await response.text();
      log('✗ Daily pick job failed', 'red');
      console.log('Response status:', response.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    log('✗ Error testing daily pick job: ' + error.message, 'red');
    console.error(error);
  }
}

async function testTodayEndpoint() {
  logSection('Testing Today Endpoint');
  
  try {
    log('Testing today endpoint...', 'blue');
    
    const response = await fetch('http://localhost:3000/api/today');
    
    if (response.ok) {
      const result = await response.json();
      log('✓ Today endpoint working', 'green');
      
      console.log('\nToday Response:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if we have today's pick
      if (result.pick) {
        log('✓ Today\'s pick is available', 'green');
      } else {
        log('⚠ No pick available for today', 'yellow');
      }
      
    } else {
      const errorText = await response.text();
      log('✗ Today endpoint failed', 'red');
      console.log('Response status:', response.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    log('✗ Error testing today endpoint: ' + error.message, 'red');
    console.error(error);
  }
}

async function checkEnvironmentSetup() {
  logSection('Checking Environment Setup');
  
  // Check required environment variables
  const requiredEnvVars = [
    'ODDS_API_KEY',
    'WEATHER_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let allEnvVarsPresent = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✓ ${envVar} is set`, 'green');
    } else {
      log(`✗ ${envVar} is missing`, 'red');
      allEnvVarsPresent = false;
    }
  }
  
  if (allEnvVarsPresent) {
    log('✓ All required environment variables are set', 'green');
  } else {
    log('✗ Some environment variables are missing', 'red');
  }
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:3000/api/today');
    if (response.status !== 404) {
      log('✓ Development server is running', 'green');
    } else {
      log('⚠ Development server may not be fully started', 'yellow');
    }
  } catch (error) {
    log('✗ Development server is not running', 'red');
    log('Please run: npm run dev', 'yellow');
  }
}

async function runAllTests() {
  log('Starting Real API Integration Tests', 'bold');
  log('This will test the complete pipeline with real API data\n', 'blue');
  
  await checkEnvironmentSetup();
  await testExternalAPIs();
  await testOddsAPI();
  await testMLPipeline();
  await testDailyPickJob();
  await testTodayEndpoint();
  
  logSection('Test Summary');
  log('Real API integration testing completed!', 'bold');
  log('Review the results above to identify any issues.', 'blue');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testOddsAPI,
  testMLPipeline,
  testDailyPickJob,
  testTodayEndpoint
};