import { received } from "../../../utils/fake-ingest"

export default defineEventHandler(async (event) => {
  const batch = JSON.parse((await readRawBody(event)) ?? "{}")

  received.push({ from: "server", authorized: getRequestHeader(event, "authorization") !== undefined, batch })
  setResponseStatus(event, 202)

  return { batch: batch.batch, accepted: batch.events?.length ?? 0, dropped: 0 }
})
