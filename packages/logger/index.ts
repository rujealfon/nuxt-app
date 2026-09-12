import type { Logger, LoggerOptions } from 'pino'
import { pino } from 'pino'

export type { Logger }

export interface CreateLoggerOptions {
  name?: string
  level?: string
  pretty?: boolean
  base?: Record<string, unknown> | null
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const isProduction = process.env.NODE_ENV === 'production'

  const {
    name,
    level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    pretty = !isProduction,
    base,
  } = options

  const config: LoggerOptions = {
    level,
    name,
  }

  if (base !== undefined) {
    config.base = base
  }

  if (pretty) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    }
  }

  return pino(config)
}
