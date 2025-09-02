// order-service.js
const express = require("express");
const app = express();
app.use(express.json());

const SERVICE = "order-service";
const PORT = process.env.PORT || 8080;
const CATALOG_URL = process.env.CATALOG_URL || "http://catalog-service:8080";
const INVENTORY_URL = process.env.INVENTORY_URL || "http://inventory-service:8080";

// helpers
function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(t) };
}

app.use((req, res, next) => {
  res.locals.reqId = req.get("x-request-id") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  res.set("x-request-id", res.locals.reqId);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, service: SERVICE }));
app.get("/info", (req, res) => res.json({ service: SERVICE, time: new Date().toISOString() }));

// POST /orders { customerId, items:[{bookId, qty}] }
app.post("/orders", async (req, res) => {
  const { customerId, items } = req.body || {};
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }
  for (const it of items) {
    if (!it.bookId || !Number.isInteger(it.qty) || it.qty <= 0) {
      return res.status(400).json({ error: "INVALID_ITEM", item: it });
    }
  }

  try {
    // fetch book details to compute totals
    const enriched = [];
    for (const it of items) {
      const { controller, cancel } = withTimeout(3500);
      try {
        const r = await fetch(`${CATALOG_URL}/books/${encodeURIComponent(it.bookId)}`, {
          headers: { "x-request-id": res.locals.reqId },
          signal: controller.signal,
        });
        if (!r.ok) {
          return res.status(400).json({ error: "CATALOG_LOOKUP_FAILED", bookId: it.bookId, status: r.status });
        }
        const book = await r.json();
        enriched.push({ ...it, title: book.title, priceCents: book.priceCents, lineTotalCents: book.priceCents * it.qty });
      } finally {
        cancel();
      }
    }

    // reserve stock
    {
      const { controller, cancel } = withTimeout(3500);
      try {
        const r = await fetch(`${INVENTORY_URL}/reserve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-request-id": res.locals.reqId },
          body: JSON.stringify({ items }),
          signal: controller.signal,
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          return res.status(r.status).json({ error: "STOCK_RESERVATION_FAILED", details: err });
        }
      } finally {
        cancel();
      }
    }

    const totalCents = enriched.reduce((sum, it) => sum + it.lineTotalCents, 0);
    const order = {
      id: `ord_${Date.now().toString(36)}`,
      customerId,
      items: enriched,
      currency: "BRL",
      totalCents,
      status: "CREATED",
      createdAt: new Date().toISOString(),
      traceId: res.locals.reqId,
    };
    return res.status(201).json(order);
  } catch (e) {
    return res.status(502).json({ error: "ORDER_CREATION_FAILED", message: e.message || String(e) });
  }
});

// simple read-back stub (real life would persist)
app.get("/prices/quote", async (req, res) => {
  const ids = (req.query.ids || "").split(",").filter(Boolean);
  if (ids.length === 0) return res.status(400).json({ error: "NO_IDS" });
  const out = [];
  for (const id of ids) {
    const r = await fetch(`${CATALOG_URL}/books/${encodeURIComponent(id)}`, {
      headers: { "x-request-id": res.locals.reqId },
    });
    if (r.ok) out.push(await r.json());
  }
  res.json({ items: out });
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
