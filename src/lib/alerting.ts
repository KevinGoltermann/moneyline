// Simple alerting system for DailyBet AI
// This can be extended to integrate with services like PagerDuty, Slack, etc.

export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical'
  service: string
  message: string
  timestamp: string
  details?: any
}

export interface AlertingConfig {
  webhookUrl?: string
  slackWebhook?: string
  emailEndpoint?: string
  enableConsoleLogging: boolean
}

class AlertingService {
  private config: AlertingConfig

  constructor(config: AlertingConfig = { enableConsoleLogging: true }) {
    this.config = config
  }

  async sendAlert(alert: Alert): Promise<void> {
    // Always log to console if enabled
    if (this.config.enableConsoleLogging) {
      const logLevel = alert.level === 'critical' || alert.level === 'error' ? 'error' : 
                      alert.level === 'warning' ? 'warn' : 'info'
      console[logLevel](`[ALERT] ${alert.service}: ${alert.message}`, alert.details)
    }

    // Send to external services in parallel
    const promises: Promise<void>[] = []

    if (this.config.webhookUrl) {
      promises.push(this.sendWebhook(alert))
    }

    if (this.config.slackWebhook) {
      promises.push(this.sendSlackAlert(alert))
    }

    if (this.config.emailEndpoint) {
      promises.push(this.sendEmailAlert(alert))
    }

    // Wait for all alerts to be sent (don't fail if one fails)
    await Promise.allSettled(promises)
  }

  private async sendWebhook(alert: Alert): Promise<void> {
    try {
      if (!this.config.webhookUrl) return

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert,
          source: 'dailybet-ai',
          environment: process.env.NODE_ENV || 'unknown'
        }),
      })

      if (!response.ok) {
        console.error(`Webhook alert failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error)
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    try {
      if (!this.config.slackWebhook) return

      const color = {
        info: '#36a64f',
        warning: '#ff9500',
        error: '#ff0000',
        critical: '#8B0000'
      }[alert.level]

      const slackPayload = {
        text: `DailyBet AI Alert: ${alert.level.toUpperCase()}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Service',
                value: alert.service,
                short: true
              },
              {
                title: 'Level',
                value: alert.level.toUpperCase(),
                short: true
              },
              {
                title: 'Message',
                value: alert.message,
                short: false
              },
              {
                title: 'Timestamp',
                value: alert.timestamp,
                short: true
              },
              {
                title: 'Environment',
                value: process.env.NODE_ENV || 'unknown',
                short: true
              }
            ]
          }
        ]
      }

      const response = await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      })

      if (!response.ok) {
        console.error(`Slack alert failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    try {
      if (!this.config.emailEndpoint) return

      const emailPayload = {
        to: process.env.ALERT_EMAIL || 'admin@dailybet-ai.com',
        subject: `DailyBet AI Alert: ${alert.level.toUpperCase()} - ${alert.service}`,
        body: `
Alert Details:
- Service: ${alert.service}
- Level: ${alert.level.toUpperCase()}
- Message: ${alert.message}
- Timestamp: ${alert.timestamp}
- Environment: ${process.env.NODE_ENV || 'unknown'}

${alert.details ? `Details: ${JSON.stringify(alert.details, null, 2)}` : ''}
        `.trim()
      }

      const response = await fetch(this.config.emailEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      })

      if (!response.ok) {
        console.error(`Email alert failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send email alert:', error)
    }
  }
}

// Create singleton instance
const alertingService = new AlertingService({
  webhookUrl: process.env.ALERT_WEBHOOK_URL,
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  emailEndpoint: process.env.EMAIL_ALERT_ENDPOINT,
  enableConsoleLogging: true
})

// Convenience functions for different alert levels
export const sendInfoAlert = (service: string, message: string, details?: any) => {
  return alertingService.sendAlert({
    level: 'info',
    service,
    message,
    timestamp: new Date().toISOString(),
    details
  })
}

export const sendWarningAlert = (service: string, message: string, details?: any) => {
  return alertingService.sendAlert({
    level: 'warning',
    service,
    message,
    timestamp: new Date().toISOString(),
    details
  })
}

export const sendErrorAlert = (service: string, message: string, details?: any) => {
  return alertingService.sendAlert({
    level: 'error',
    service,
    message,
    timestamp: new Date().toISOString(),
    details
  })
}

export const sendCriticalAlert = (service: string, message: string, details?: any) => {
  return alertingService.sendAlert({
    level: 'critical',
    service,
    message,
    timestamp: new Date().toISOString(),
    details
  })
}

// Health check monitoring function
export const monitorSystemHealth = async (): Promise<void> => {
  try {
    const healthUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api/health'
      : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/health`

    const response = await fetch(healthUrl)
    const health = await response.json()

    if (health.status === 'unhealthy') {
      await sendCriticalAlert(
        'system_health',
        'System health check failed',
        health
      )
    } else if (health.status === 'degraded') {
      await sendWarningAlert(
        'system_health',
        'System performance degraded',
        health
      )
    }

    // Check if today's pick exists (after 3 PM Denver time)
    const now = new Date()
    const denverTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Denver"}))
    const hour = denverTime.getHours()

    if (hour >= 15 && !health.today_pick_status?.exists) {
      await sendErrorAlert(
        'daily_pick',
        'No pick generated for today after 3 PM Denver time',
        { current_time: denverTime.toISOString() }
      )
    }

  } catch (error) {
    await sendCriticalAlert(
      'monitoring',
      'Failed to check system health',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

export default alertingService