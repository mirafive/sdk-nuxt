import { fakeFlags } from "../../../utils/fake-ingest"

export default defineEventHandler(() => {
  const { "server-only": _, ...website } = fakeFlags

  return { v: 1, at: Date.now(), flags: website }
})
