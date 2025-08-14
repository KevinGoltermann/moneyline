#!/usr/bin/env node

/**
 * System monitoring script for DailyBet AI
 * Can be run locally or as part of CI/CD pipeline
 * 
 * Usage:
 *   node scripts/monitor-system.js
 *   node scripts/monitor-system.js --url https://your-domain.vercel.app
 *   node scripts/monitor-system.js --admin-secret YOUR_SECRET
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.argv.includes('--url') 
    ? process.argv[process.argv.indexOf('--url') + 1]
    : process.env.VERCEL_URL || 'http://localhost:3000',
  adminSecret: process.argv.includes('--admin-secret')
    ? process.argv[process.argv.indexOf('--admin-secret') + 1]
    : process.env.ADMIN_SECRET,
  timeout: 30000, // 30 seconds
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function checkHealth() {
  log('\n🏥 Checking System Health...', colors.blue);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health`);
    
    if (response.status === 200) {
      const health = response.data;
      log(`✅ System Status: ${health.status.toUpperCase()}`, 
          health.status === 'healthy' ? colors.green : 
          health.status === 'degraded' ? colors.yellow : colors.red);
      
      if (config.verbose) {
        log(`   Environment: ${health.environment}`);
        log(`   Version: ${health.version}`);
        log(`   Timestamp: ${health.timestamp}`);
        
        health.checks.forEach(check => {
          const statusColor = check.status === 'healthy' ? colors.green :
                             check.status === 'degraded' ? colors.yellow : colors.red;
          log(`   ${check.service}: ${check.status} (${check.response_time}ms)`, statusColor);
        });
        
        log(`   Today's Pick: ${health.today_pick_status.exists ? 'Generated' : 'Not Generated'}`,
            health.today_pick_status.exists ? colors.green : colors.yellow);
      }
      
      return health.status === 'healthy';
    } else {
      log(`❌ Health check failed with status ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, colors.red);
    return false;
  }
}

async function checkPublicEndpoints() {
  log('\n🌐 Checking Public Endpoints...', colors.blue);
  
  const endpoints = [
    { path: '/', name: 'Home Page' },
    { path: '/performance', name: 'Performance Page' },
    { path: '/api/today', name: 'Today API' },
    { path: '/api/performance', name: 'Performance API' }
  ];
  
  let allHealthy = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${config.baseUrl}${endpoint.path}`);
      
      if (response.status >= 200 && response.status < 300) {
        log(`✅ ${endpoint.name}: OK (${response.status})`, colors.green);
      } else {
        log(`⚠️  ${endpoint.name}: ${response.status}`, colors.yellow);
        allHealthy = false;
      }
    } catch (error) {
      log(`❌ ${endpoint.name}: ${error.message}`, colors.red);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

async function checkAdminEndpoints() {
  if (!config.adminSecret) {
    log('\n🔐 Skipping Admin Endpoints (no admin secret provided)', colors.yellow);
    return true;
  }
  
  log('\n🔐 Checking Admin Endpoints...', colors.blue);
  
  const endpoints = [
    { path: '/api/admin/monitoring', name: 'Admin Monitoring', method: 'GET' },
    { path: '/api/admin/unsettled', name: 'Unsettled Picks', method: 'GET' }
  ];
  
  let allHealthy = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${config.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${config.adminSecret}`
        }
      });
      
      if (response.status >= 200 && response.status < 300) {
        log(`✅ ${endpoint.name}: OK (${response.status})`, colors.green);
      } else {
        log(`⚠️  ${endpoint.name}: ${response.status}`, colors.yellow);
        allHealthy = false;
      }
    } catch (error) {
      log(`❌ ${endpoint.name}: ${error.message}`, colors.red);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

async function checkCronJob() {
  log('\n⏰ Checking Cron Job Status...', colors.blue);
  
  try {
    // Check cron job health endpoint
    const response = await makeRequest(`${config.baseUrl}/api/jobs/daily-pick`);
    
    if (response.status === 200) {
      const cronStatus = response.data;
      log(`✅ Cron Job: Healthy`, colors.green);
      
      if (config.verbose) {
        log(`   Environment: ${cronStatus.environment}`);
        log(`   Today's Date: ${cronStatus.today_date}`);
        log(`   Pick Exists: ${cronStatus.pick_exists_today}`);
      }
      
      return true;
    } else {
      log(`⚠️  Cron Job: Status ${response.status}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`❌ Cron Job: ${error.message}`, colors.red);
    return false;
  }
}

async function runMonitoring() {
  log(`${colors.bright}🚀 DailyBet AI System Monitor${colors.reset}`);
  log(`Target: ${config.baseUrl}`);
  log(`Time: ${new Date().toISOString()}`);
  
  const results = {
    health: await checkHealth(),
    publicEndpoints: await checkPublicEndpoints(),
    adminEndpoints: await checkAdminEndpoints(),
    cronJob: await checkCronJob()
  };
  
  // Summary
  log('\n📊 Summary:', colors.bright);
  
  const checks = [
    { name: 'System Health', result: results.health },
    { name: 'Public Endpoints', result: results.publicEndpoints },
    { name: 'Admin Endpoints', result: results.adminEndpoints },
    { name: 'Cron Job', result: results.cronJob }
  ];
  
  let overallHealthy = true;
  
  checks.forEach(check => {
    const status = check.result ? '✅ PASS' : '❌ FAIL';
    const color = check.result ? colors.green : colors.red;
    log(`   ${check.name}: ${status}`, color);
    
    if (!check.result) {
      overallHealthy = false;
    }
  });
  
  log(`\n${colors.bright}Overall Status: ${overallHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}${colors.reset}`);
  
  // Exit with appropriate code
  process.exit(overallHealthy ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
DailyBet AI System Monitor

Usage:
  node scripts/monitor-system.js [options]

Options:
  --url <url>              Base URL to monitor (default: http://localhost:3000)
  --admin-secret <secret>  Admin secret for protected endpoints
  --verbose, -v            Verbose output
  --help, -h              Show this help message

Examples:
  node scripts/monitor-system.js
  node scripts/monitor-system.js --url https://dailybet-ai.vercel.app
  node scripts/monitor-system.js --admin-secret your-secret --verbose
  `);
  process.exit(0);
}

// Run the monitoring
runMonitoring().catch(error => {
  log(`\n❌ Monitoring failed: ${error.message}`, colors.red);
  process.exit(1);
});