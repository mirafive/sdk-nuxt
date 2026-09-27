import { fakeFlags } from "../../../utils/fake-ingest"

// The server document: `w: 1` marks flags the website reads too; "server-only" never reaches a page.
export default defineEventHandler((event) => {
  if (getRequestHeader(event, "authorization") !== `Bearer ${process.env.MIRAFIVE_SECRET_KEY}`) {
    throw createError({ statusCode: 401 })
  }

  const { "server-only": serverOnly, ...website } = fakeFlags

  return {
    v: 1,
    at: Date.now(),
    flags: {
      ...Object.fromEntries(Object.entries(website).map(([key, value]) => [key, { ...value, w: 1 }])),
      "server-only": serverOnly
    }
  }
})
