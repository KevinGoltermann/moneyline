import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint for SportsData.io integration
 * GET /api/test-sportsdata
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'SportsData.io test endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}