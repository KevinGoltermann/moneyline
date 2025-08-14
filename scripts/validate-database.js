/**
 * Simple validation script to test database setup
 * Run with: node scripts/validate-database.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          process.env[key.trim()] = value
        }
      }
    })

    console.log('📁 Loaded environment variables from .env.local')
  } else {
    console.log('⚠️  No .env.local file found')
  }
}

async function validateDatabase() {
  console.log('🔍 Validating database setup...\n')

  // Load environment variables first
  loadEnvFile()

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    return false
  }

  console.log('✅ Environment variables found')

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test connection by checking if picks table exists
    console.log('🔗 Testing database connection...')
    const { data, error } = await supabase
      .from('picks')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Database connection failed:', error.message)
      console.log('\nPossible issues:')
      console.log('- Tables not created yet (run migrations)')
      console.log('- Invalid credentials')
      console.log('- Network connectivity issues')
      return false
    }

    console.log('✅ Database connection successful')

    // Check if performance view exists
    console.log('📊 Testing performance view...')
    const { data: perfData, error: perfError } = await supabase
      .from('v_performance')
      .select('*')
      .single()

    if (perfError && !perfError.message.includes('No rows')) {
      console.error('❌ Performance view not accessible:', perfError.message)
      return false
    }

    console.log('✅ Performance view accessible')
    console.log('\n🎉 Database setup validation complete!')
    console.log('\nNext steps:')
    console.log('1. Run the migration files in your Supabase dashboard')
    console.log('2. Test creating a pick using the API endpoints')

    return true

  } catch (error) {
    console.error('❌ Validation failed:', error.message)
    return false
  }
}

// Run validation if called directly
if (require.main === module) {
  validateDatabase()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Validation error:', error)
      process.exit(1)
    })
}

module.exports = { validateDatabase }