import { GoogleKeepBot } from "./src/google-keep-bot.ts"

// @ts-ignore
const { KEEP_SHOPPING_LIST_ID, KEEP_MASTER_KEY, KEEP_EMAIL } = (process as { env: Record<string, string> }).env

const c = new GoogleKeepBot(KEEP_SHOPPING_LIST_ID)

await c.authenticate({ email: KEEP_EMAIL, masterKey: KEEP_MASTER_KEY })

console.log(await c.getDerp())
// await c.addDerp("123123123123", "Käse", false)
console.log(await c.getDerp())
