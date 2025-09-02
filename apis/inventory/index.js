// inventory-service.js
const express = require("express");
const app = express();
app.use(express.json());

const SERVICE = "inventory-service";
const PORT = process.env.PORT || 8080;

// in-memory stock per bookId
const stock = new Map(Object.entries({ "1": 5, "2": 3, "3": 10 }));

app.use((req, res, next) => {
  res.locals.reqId = req.get("x-request-id") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  res.set("x-request-id", res.locals.reqId);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, service: SERVICE }));
app.get("/info", (req, res) => res.json({ service: SERVICE, time: new Date().toISOString() }));

// get current stock for a book
app.get("/inventory/:bookId", (req, res) => {
  const s = stock.get(req.params.bookId);
  if (s == null) return res.status(404).json({ error: "BOOK_NOT_TRACKED" });
  res.json({ bookId: req.params.bookId, stock: s });
});

// reserve stock (atomic enough for demo)
app.post("/reserve", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "INVALID_ITEMS" });
  }
  // validate availability
  for (const it of items) {
    if (!it.bookId || !Number.isInteger(it.qty) || it.qty <= 0) {
      return res.status(400).json({ error: "INVALID_ITEM", item: it });
    }
    const current = stock.get(it.bookId);
    if (current == null || current < it.qty) {
      return res.status(409).json({ error: "INSUFFICIENT_STOCK", bookId: it.bookId, requested: it.qty, available: current ?? 0 });
    }
  }
  // perform reservation
  for (const it of items) stock.set(it.bookId, stock.get(it.bookId) - it.qty);
  res.status(201).json({ reserved: items, remaining: Object.fromEntries(stock) });
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
