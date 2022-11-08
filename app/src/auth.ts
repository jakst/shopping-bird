import { env } from './env'

export const REQUIRED_AUTH_HEADER = `Basic ${btoa(env.AUTH_INFO)}`
