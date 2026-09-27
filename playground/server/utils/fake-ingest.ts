// A stand-in for events.mirafive.io so the playground runs offline.
const flag = (s: string, t: "b" | "c", d: string, x: string, p?: Record<string, unknown>) => ({
  s,
  t,
  u: "b",
  d,
  r: [{ x }],
  ...(p ? { p } : {})
})

export const fakeFlags = {
  "new-checkout": flag("nc", "b", "off", "on"),
  limits: flag("lm", "c", "free", "pro", { free: { max: 1 }, pro: { max: 3 } }),
  "server-only": flag("so", "b", "off", "on")
}

export const received: unknown[] = []
