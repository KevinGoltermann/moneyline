#!/usr/bin/env node

/**
 * Manual test script for the daily pick cron job
 * This script simulates calling the cron endpoint to test the complete flow
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  console.log('🔍 Testing health check endpoint...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/jobs/daily-pick`, {
      method: 'GET'
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    return false;
  }
}

async function testCronJob() {
  console.log('🚀 Testing daily pick cron job...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/jobs/daily-pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Cron job executed successfully');
      
      if (response.data.pick_generated) {
        console.log('🎯 New pick generated:', response.data.pick_generated);
      } else {
        console.log('ℹ️ No new pick generated (may already exist)');
      }
      
      return true;
    } else {
      console.log('❌ Cron job failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Cron job error:', error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('🔒 Testing unauthorized access...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/jobs/daily-pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No authorization header
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ Unauthorized access properly blocked');
      return true;
    } else {
      console.log('❌ Unauthorized access not properly blocked');
      return false;
    }
  } catch (error) {
    console.error('❌ Unauthorized access test error:', error.message);
    return false;
  }
}

async function testTodayEndpoint() {
  console.log('📊 Testing today endpoint to see if pick was created...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/today`, {
      method: 'GET'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      if (response.data.pick) {
        console.log('✅ Today\'s pick found:');
        console.log(`   Selection: ${response.data.pick.selection}`);
        console.log(`   Odds: ${response.data.pick.odds}`);
        console.log(`   Confidence: ${response.data.pick.confidence}%`);
        console.log(`   League: ${response.data.pick.league}`);
      } else {
        console.log('ℹ️ No pick found for today');
      }
      
      console.log('Performance:', response.data.performance);
      return true;
    } else {
      console.log('❌ Failed to fetch today\'s data');
      return false;
    }
  } catch (error) {
    console.error('❌ Today endpoint error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Daily Pick Cron Job Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Cron Secret: ${CRON_SECRET ? '[SET]' : '[NOT SET]'}`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test 1: Health Check
  results.push(await testHealthCheck());
  console.log();
  
  // Test 2: Unauthorized Access
  results.push(await testUnauthorizedAccess());
  console.log();
  
  // Test 3: Cron Job Execution
  results.push(await testCronJob());
  console.log();
  
  // Test 4: Verify Pick Creation
  results.push(await testTodayEndpoint());
  console.log();
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('=' .repeat(50));
  console.log(`📋 Test Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Daily pick cron job is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Daily Pick Cron Job Test Script

Usage: node scripts/test-daily-pick.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  TEST_URL       Base URL for testing (default: http://localhost:3000)
  CRON_SECRET    Cron secret for authentication (default: dev-cron-secret)

Examples:
  # Test against local development server
  node scripts/test-daily-pick.js
  
  # Test against production
  TEST_URL=https://your-app.vercel.app node scripts/test-daily-pick.js
  `);
  process.exit(0);
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});