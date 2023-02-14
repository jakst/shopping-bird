import { SolidAuth } from "@auth/solid-start"
import { authOptions } from "~/lib/auth/options"

// eslint-disable-next-line @typescript-eslint/unbound-method
export const { GET, POST } = SolidAuth(authOptions)
