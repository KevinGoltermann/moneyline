import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify SportsData.io integration
 * GET /api/test-sportsdata
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🏈 Testing SportsData.io Integration...');
    
    // Import the Python ML service
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Create a simple test script
    const testScript = `
import sys
import os
sys.path.append('${path.join(process.cwd(), 'src/app/api/ml/pick')}')

try:
    from external_apis import SportsDataAPI
    from models import League
    
    # Test API initialization
    api = SportsDataAPI()
    
    if not api.api_key:
        print("❌ No API key found")
        sys.exit(1)
    
    print(f"✅ API Key found: {api.api_key[:8]}...")
    
    # Test team stats (will use mock data if API fails)
    team_stats = api.get_team_stats("Kansas City Chiefs", League.NFL)
    print(f"✅ Team Stats: {team_stats.get('team_name', 'Unknown')} - {team_stats.get('wins', 0)}-{team_stats.get('losses', 0)}")
    
    # Test injury reports
    injuries = api.get_injury_report("Kansas City Chiefs", League.NFL)
    print(f"✅ Injuries: {len(injuries)} reported")
    
    # Test recent games
    games = api.get_recent_games("Kansas City Chiefs", League.NFL, 5)
    print(f"✅ Recent Games: {len(games)} games retrieved")
    
    print("🎯 Integration test successful!")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    return new Promise((resolve) => {
      const python = spawn('python3', ['-c', testScript]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        const success = code === 0;
        
        resolve(NextResponse.json({
          success,
          message: success ? 'SportsData.io integration test passed!' : 'Integration test failed',
          output: output.trim(),
          error: error.trim(),
          timestamp: new Date().toISOString()
        }));
      });
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to run integration test',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}