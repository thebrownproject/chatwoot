import pino from 'pino';

export const logger = pino({
  name: 'workers',
  level: process.env.LOG_LEVEL ?? 'info',
});
