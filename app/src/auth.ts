import { env } from './env'

export const REQUIRED_AUTH_HEADER = `Basic ${Buffer.from(
  env.AUTH_INFO
).toString('base64')}`
