/**
 * External API integration utilities for fetching game data, odds, and other contextual information
 * This module provides functions to integrate with various sports data APIs
 */

import { Game } from '@/lib/types'
import { fetchWithRetry, withRetry, CircuitBreaker } from '@/lib/retry'
import { AppError, ERROR_CODES, ErrorSeverity, logError } from '@/lib/error-handling'

// The Odds API configuration
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'
const ODDS_API_KEY = process.env.ODDS_API_KEY

// Weather API configuration
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5'
const WEATHER_API_KEY = process.env.WEATHER_API_KEY

// Circuit breakers for external services
const oddsApiCircuitBreaker = new CircuitBreaker(5, 60000) // 5 failures, 1 minute recovery
const weatherApiCircuitBreaker = new CircuitBreaker(3, 30000) // 3 failures, 30 second recovery

// Supported sports for odds API
const SUPPORTED_SPORTS = {
  NFL: 'americanfootball_nfl',
  NBA: 'basketball_nba',
  MLB: 'baseball_mlb',
  NHL: 'icehockey_nhl'
} as const

interface OddsAPIGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Array<{
    key: string
    title: string
    markets: Array<{
      key: string
      outcomes: Array<{
        name: string
        price: number
      }>
    }>
  }>
}

interface WeatherData {
  main: {
    temp: number
    humidity: number
    pressure: number
  }
  weather: Array<{
    main: string
    description: string
  }>
  wind: {
    speed: number
    deg: number
  }
  visibility: number
}

/**
 * Fetch games and odds from The Odds API
 */
export async function fetchGamesFromOddsAPI(date: string): Promise<Game[]> {
  if (!ODDS_API_KEY) {
    console.warn('ODDS_API_KEY not configured, using mock data')
    return getMockGameData(date)
  }

  try {
    const games: Game[] = []
    
    // Fetch games for each supported sport
    for (const [league, sportKey] of Object.entries(SUPPORTED_SPORTS)) {
      try {
        const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds`
        const params = new URLSearchParams({
          apiKey: ODDS_API_KEY,
          regions: 'us',
          markets: 'h2h', // head-to-head (moneyline)
          oddsFormat: 'american',
          dateFormat: 'iso'
        })

        console.log(`Fetching ${league} games from Odds API`)
        
        const response = await oddsApiCircuitBreaker.execute(async () => {
          return await fetchWithRetry(`${url}?${params}`, {
            headers: {
              'Accept': 'application/json'
            }
          }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            retryCondition: (error) => {
              // Retry on server errors and rate limiting
              return error.status >= 500 || error.status === 429
            }
          })
        })

        const data: OddsAPIGame[] = await response.json()
        
        // Filter games for the target date and convert to our format
        const targetDate = new Date(date + 'T00:00:00Z')
        const dayStart = new Date(targetDate)
        const dayEnd = new Date(targetDate)
        dayEnd.setUTCHours(23, 59, 59, 999)

        for (const game of data) {
          const gameTime = new Date(game.commence_time)
          
          // Only include games for the target date
          if (gameTime >= dayStart && gameTime <= dayEnd) {
            const convertedGame = await convertOddsAPIGame(game, league as keyof typeof SUPPORTED_SPORTS)
            if (convertedGame) {
              games.push(convertedGame)
            }
          }
        }
        
        console.log(`Found ${games.length} ${league} games for ${date}`)
        
      } catch (error) {
        logError(
          `Error fetching ${league} games from Odds API`,
          ERROR_CODES.ODDS_API_ERROR,
          error instanceof AppError ? error.statusCode : 503,
          { league, error: error instanceof Error ? error.message : String(error) }
        )
        continue
      }
    }

    return games

  } catch (error) {
    console.error('Error fetching games from Odds API:', error)
    // Fallback to mock data
    return getMockGameData(date)
  }
}

/**
 * Convert Odds API game format to our internal Game format
 */
async function convertOddsAPIGame(oddsGame: OddsAPIGame, league: keyof typeof SUPPORTED_SPORTS): Promise<Game | null> {
  try {
    // Find the best available odds from bookmakers
    let homeOdds: number | undefined
    let awayOdds: number | undefined

    for (const bookmaker of oddsGame.bookmakers) {
      const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h')
      if (h2hMarket) {
        const homeOutcome = h2hMarket.outcomes.find(o => o.name === oddsGame.home_team)
        const awayOutcome = h2hMarket.outcomes.find(o => o.name === oddsGame.away_team)
        
        if (homeOutcome && awayOutcome) {
          homeOdds = homeOutcome.price
          awayOdds = awayOutcome.price
          break // Use first available odds
        }
      }
    }

    if (!homeOdds || !awayOdds) {
      console.warn(`No valid odds found for game: ${oddsGame.away_team} @ ${oddsGame.home_team}`)
      return null
    }

    // Get weather data for outdoor sports
    let weather: Record<string, any> | undefined
    if (league === 'NFL' || league === 'MLB') {
      weather = await getWeatherForGame(oddsGame.home_team, oddsGame.commence_time)
    }

    const game: Game = {
      home_team: oddsGame.home_team,
      away_team: oddsGame.away_team,
      league,
      start_time: oddsGame.commence_time,
      odds: {
        home_ml: homeOdds,
        away_ml: awayOdds
      }
    }

    return game

  } catch (error) {
    console.error('Error converting Odds API game:', error)
    return null
  }
}

/**
 * Get weather data for outdoor games
 */
async function getWeatherForGame(homeTeam: string, gameTime: string): Promise<Record<string, any> | undefined> {
  if (!WEATHER_API_KEY) {
    return undefined
  }

  // Map team names to cities (simplified mapping)
  const teamCityMap: Record<string, string> = {
      // NFL teams
      'Arizona Cardinals': 'Phoenix,AZ',
      'Atlanta Falcons': 'Atlanta,GA',
      'Baltimore Ravens': 'Baltimore,MD',
      'Buffalo Bills': 'Buffalo,NY',
      'Carolina Panthers': 'Charlotte,NC',
      'Chicago Bears': 'Chicago,IL',
      'Cincinnati Bengals': 'Cincinnati,OH',
      'Cleveland Browns': 'Cleveland,OH',
      'Dallas Cowboys': 'Dallas,TX',
      'Denver Broncos': 'Denver,CO',
      'Detroit Lions': 'Detroit,MI',
      'Green Bay Packers': 'Green Bay,WI',
      'Houston Texans': 'Houston,TX',
      'Indianapolis Colts': 'Indianapolis,IN',
      'Jacksonville Jaguars': 'Jacksonville,FL',
      'Kansas City Chiefs': 'Kansas City,MO',
      'Las Vegas Raiders': 'Las Vegas,NV',
      'Los Angeles Chargers': 'Los Angeles,CA',
      'Los Angeles Rams': 'Los Angeles,CA',
      'Miami Dolphins': 'Miami,FL',
      'Minnesota Vikings': 'Minneapolis,MN',
      'New England Patriots': 'Boston,MA',
      'New Orleans Saints': 'New Orleans,LA',
      'New York Giants': 'New York,NY',
      'New York Jets': 'New York,NY',
      'Philadelphia Eagles': 'Philadelphia,PA',
      'Pittsburgh Steelers': 'Pittsburgh,PA',
      'San Francisco 49ers': 'San Francisco,CA',
      'Seattle Seahawks': 'Seattle,WA',
      'Tampa Bay Buccaneers': 'Tampa,FL',
      'Tennessee Titans': 'Nashville,TN',
      'Washington Commanders': 'Washington,DC',
      
      // MLB teams (add as needed)
      'Los Angeles Angels': 'Los Angeles,CA',
      'Houston Astros': 'Houston,TX',
      'Oakland Athletics': 'Oakland,CA',
      'Toronto Blue Jays': 'Toronto,ON',
      'Atlanta Braves': 'Atlanta,GA',
      'Milwaukee Brewers': 'Milwaukee,WI',
      'St. Louis Cardinals': 'St. Louis,MO',
      'Chicago Cubs': 'Chicago,IL',
      'Arizona Diamondbacks': 'Phoenix,AZ',
      'Colorado Rockies': 'Denver,CO',
      'Los Angeles Dodgers': 'Los Angeles,CA',
      'San Diego Padres': 'San Diego,CA',
      'San Francisco Giants': 'San Francisco,CA',
      'Cincinnati Reds': 'Cincinnati,OH',
      'Miami Marlins': 'Miami,FL',
      'New York Mets': 'New York,NY',
      'Philadelphia Phillies': 'Philadelphia,PA',
      'Pittsburgh Pirates': 'Pittsburgh,PA',
      'Washington Nationals': 'Washington,DC',
      'Chicago White Sox': 'Chicago,IL',
      'Cleveland Guardians': 'Cleveland,OH',
      'Detroit Tigers': 'Detroit,MI',
      'Kansas City Royals': 'Kansas City,MO',
      'Minnesota Twins': 'Minneapolis,MN',
      'New York Yankees': 'New York,NY',
      'Baltimore Orioles': 'Baltimore,MD',
      'Boston Red Sox': 'Boston,MA',
      'Seattle Mariners': 'Seattle,WA',
      'Tampa Bay Rays': 'Tampa,FL',
      'Texas Rangers': 'Dallas,TX'
    }

    const city = teamCityMap[homeTeam]
    if (!city) {
      console.warn(`No city mapping found for team: ${homeTeam}`)
      return undefined
    }

    try {
      const url = `${WEATHER_API_BASE_URL}/weather`
    const params = new URLSearchParams({
      q: city,
      appid: WEATHER_API_KEY,
      units: 'imperial'
    })

    const response = await weatherApiCircuitBreaker.execute(async () => {
      return await fetchWithRetry(`${url}?${params}`, {}, {
        maxAttempts: 2,
        baseDelayMs: 500,
        retryCondition: (error) => {
          // Only retry on server errors for weather API
          return error.status >= 500
        }
      })
    })

    const weatherData: WeatherData = await response.json()
    
    return {
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      conditions: weatherData.weather[0]?.description || 'unknown',
      wind_speed: weatherData.wind.speed,
      wind_direction: weatherData.wind.deg,
      visibility: weatherData.visibility
    }
  } catch (error) {
    logError(
      'Error fetching weather data',
      ERROR_CODES.WEATHER_API_ERROR,
      error instanceof AppError ? error.statusCode : 503,
      { city, error: error instanceof Error ? error.message : String(error) }
    )
    return undefined
  }
}

/**
 * Mock game data for development and testing
 */
export function getMockGameData(date: string): Game[] {
  const games: Game[] = [
    {
      home_team: "Lakers",
      away_team: "Warriors",
      league: "NBA",
      start_time: `${date}T20:00:00Z`,
      odds: {
        home_ml: -110,
        away_ml: -110
      }
    },
    {
      home_team: "Chiefs",
      away_team: "Bills",
      league: "NFL",
      start_time: `${date}T18:00:00Z`,
      odds: {
        home_ml: -150,
        away_ml: +130
      }
    },
    {
      home_team: "Dodgers",
      away_team: "Giants",
      league: "MLB",
      start_time: `${date}T19:30:00Z`,
      odds: {
        home_ml: -125,
        away_ml: +105
      }
    }
  ]

  // Filter games based on current season (simplified logic)
  const currentMonth = new Date().getMonth() + 1
  
  if (currentMonth >= 9 || currentMonth <= 2) {
    // NFL and NBA season
    return games.filter(g => g.league === 'NFL' || g.league === 'NBA')
  } else if (currentMonth >= 3 && currentMonth <= 10) {
    // MLB season
    return games.filter(g => g.league === 'MLB' || g.league === 'NBA')
  } else {
    // NBA only
    return games.filter(g => g.league === 'NBA')
  }
}

/**
 * Fetch injury reports and team news (placeholder for future implementation)
 */
export async function fetchInjuryReports(teams: string[]): Promise<Record<string, string[]>> {
  // This would integrate with sports news APIs or injury report services
  // For now, return empty object
  return {}
}

/**
 * Fetch recent team performance and statistics (placeholder for future implementation)
 */
export async function fetchTeamStats(teams: string[], league: string): Promise<Record<string, any>> {
  // This would integrate with sports statistics APIs
  // For now, return empty object
  return {}
}

/**
 * Health check for external APIs
 */
export async function checkExternalAPIsHealth(): Promise<{
  odds_api: 'available' | 'unavailable'
  weather_api: 'available' | 'unavailable'
}> {
  const results: {
    odds_api: 'available' | 'unavailable'
    weather_api: 'available' | 'unavailable'
  } = {
    odds_api: 'unavailable',
    weather_api: 'unavailable'
  }

  // Check Odds API
  if (ODDS_API_KEY) {
    try {
      await withRetry(async () => {
        const response = await fetch(`${ODDS_API_BASE_URL}/sports?apiKey=${ODDS_API_KEY}`, {
          method: 'GET'
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response
      }, {
        maxAttempts: 2,
        baseDelayMs: 1000
      })
      results.odds_api = 'available'
    } catch (error) {
      logError('Odds API health check failed', ERROR_CODES.ODDS_API_ERROR, undefined, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  // Check Weather API
  if (WEATHER_API_KEY) {
    try {
      await withRetry(async () => {
        const response = await fetch(`${WEATHER_API_BASE_URL}/weather?q=New York&appid=${WEATHER_API_KEY}`, {
          method: 'GET'
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response
      }, {
        maxAttempts: 2,
        baseDelayMs: 500
      })
      results.weather_api = 'available'
    } catch (error) {
      logError('Weather API health check failed', ERROR_CODES.WEATHER_API_ERROR, undefined, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  return results
}