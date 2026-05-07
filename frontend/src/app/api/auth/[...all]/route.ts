import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/features/auth/servers/auth";

export const { GET, POST } = toNextJsHandler(auth);
