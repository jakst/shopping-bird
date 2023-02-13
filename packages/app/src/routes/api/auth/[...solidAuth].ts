import { SolidAuth } from "@solid-auth/next"
import { authOptions } from "~/lib/authOptions"

// eslint-disable-next-line @typescript-eslint/unbound-method
export const { GET, POST } = SolidAuth(authOptions)
