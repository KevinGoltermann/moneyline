#!/usr/bin/env node

/**
 * Test ML pipeline with real game data from Odds API
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

async function fetchRealGames() {
  logSection('Fetching Real Game Data');
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY;
  const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
  
  if (!ODDS_API_KEY) {
    log('✗ ODDS_API_KEY not found', 'red');
    return [];
  }
  
  try {
    // Get NFL games for today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    log('Fetching NFL games...', 'blue');
    const url = `${ODDS_API_BASE_URL}/sports/americanfootball_nfl/odds`;
    const params = new URLSearchParams({
      apiKey: ODDS_API_KEY,
      regions: 'us',
      markets: 'h2h',
      oddsFormat: 'american',
      dateFormat: 'iso'
    });
    
    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      log(`✗ Odds API error: ${response.status}`, 'red');
      return [];
    }
    
    const games = await response.json();
    log(`✓ Retrieved ${games.length} NFL games`, 'green');
    
    // Convert to our format and filter for games in the next few days
    const convertedGames = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 7); // Next 7 days
    
    for (const game of games.slice(0, 5)) { // Take first 5 games
      const gameTime = new Date(game.commence_time);
      
      if (gameTime <= cutoffDate) {
        // Find best odds
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
          const convertedGame = {
            home_team: game.home_team,
            away_team: game.away_team,
            league: 'NFL',
            start_time: game.commence_time,
            odds: {
              home_ml: homeOdds,
              away_ml: awayOdds
            }
          };
          
          convertedGames.push(convertedGame);
          
          log(`Added: ${game.away_team} @ ${game.home_team} (${homeOdds}/${awayOdds})`, 'blue');
        }
      }
    }
    
    return convertedGames;
    
  } catch (error) {
    log(`✗ Error fetching games: ${error.message}`, 'red');
    return [];
  }
}

async function testMLPipelineWithRealData() {
  logSection('Testing ML Pipeline with Real Data');
  
  // Get real games
  const games = await fetchRealGames();
  
  if (games.length === 0) {
    log('✗ No games available for testing', 'red');
    return;
  }
  
  log(`Using ${games.length} games for ML testing`, 'green');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const requestData = {
      date: today,
      games: games,
      min_confidence: 60,
      min_odds: -200,
      max_odds: 200
    };
    
    log('Sending request to ML pipeline...', 'blue');
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/ml/pick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      log('✓ ML pipeline executed successfully!', 'green');
      
      console.log('\n' + '='.repeat(40));
      log('ML PICK RESULT:', 'bold');
      console.log('='.repeat(40));
      console.log(JSON.stringify(result, null, 2));
      
      // Validate the response
      if (result.selection && result.confidence && result.odds) {
        log(`✓ Generated pick: ${result.selection}`, 'green');
        log(`✓ Confidence: ${result.confidence}%`, 'green');
        log(`✓ Odds: ${result.odds}`, 'green');
        log(`✓ Expected Value: ${result.expected_value}`, 'green');
        
        if (result.rationale) {
          log('✓ Rationale included', 'green');
          console.log('Reasoning:', result.rationale.reasoning);
        }
        
      } else {
        log('⚠ Response missing required fields', 'yellow');
      }
      
    } else {
      log('✗ ML pipeline failed', 'red');
      console.log('Response status:', response.status);
      console.log('Response:', responseText);
    }
    
  } catch (error) {
    log(`✗ Error testing ML pipeline: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testDailyPickJobWithRealData() {
  logSection('Testing Daily Pick Job');
  
  try {
    log('Testing daily pick job with real data...', 'blue');
    
    const response = await fetch('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`
      }
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      log('✓ Daily pick job executed successfully!', 'green');
      
      console.log('\n' + '='.repeat(40));
      log('DAILY PICK JOB RESULT:', 'bold');
      console.log('='.repeat(40));
      console.log(JSON.stringify(result, null, 2));
      
      if (result.pick_id) {
        log('✓ Pick saved to database', 'green');
        
        // Test the /api/today endpoint to see if we can retrieve it
        log('\nTesting /api/today endpoint...', 'blue');
        const todayResponse = await fetch('http://localhost:3000/api/today');
        const todayText = await todayResponse.text();
        
        if (todayResponse.ok) {
          const todayResult = JSON.parse(todayText);
          log('✓ Today endpoint now returns pick!', 'green');
          console.log('Today\'s pick:', JSON.stringify(todayResult, null, 2));
        } else {
          log('⚠ Today endpoint still has issues', 'yellow');
          console.log('Today response:', todayText);
        }
      }
      
    } else {
      log('✗ Daily pick job failed', 'red');
      console.log('Response status:', response.status);
      console.log('Response:', responseText);
    }
    
  } catch (error) {
    log(`✗ Error testing daily pick job: ${error.message}`, 'red');
    console.error(error);
  }
}

async function runFullTest() {
  log('Testing ML Pipeline with Real API Data', 'bold');
  log('This will test the complete pipeline with actual game data\n', 'blue');
  
  await testMLPipelineWithRealData();
  await testDailyPickJobWithRealData();
  
  logSection('Real Data Test Summary');
  log('Real data testing completed!', 'bold');
  log('The system should now be working with live game data.', 'blue');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runFullTest().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runFullTest,
  fetchRealGames,
  testMLPipelineWithRealData,
  testDailyPickJobWithRealData
};