// catalog-service.js
const express = require("express");
const app = express();
app.use(express.json());

const SERVICE = "catalog-service";
const PORT = process.env.PORT || 8080;

// in-memory catalog (id, title, author, priceCents)
const books = new Map([
  ["1", { id: "1", title: "Clean Code", author: "Robert C. Martin", priceCents: 15990 }],
  ["2", { id: "2", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", priceCents: 23990 }],
  ["3", { id: "3", title: "The Pragmatic Programmer", author: "Hunt & Thomas", priceCents: 17990 }],
]);

// middleware: request id
app.use((req, res, next) => {
  res.locals.reqId = req.get("x-request-id") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  res.set("x-request-id", res.locals.reqId);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, service: SERVICE }));
app.get("/info", (req, res) => res.json({ service: SERVICE, time: new Date().toISOString() }));

// list/search
app.get("/books", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const data = [...books.values()].filter(
    b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  );
  res.json({ items: data, count: data.length });
});

// get by id
app.get("/books/:id", (req, res) => {
  const book = books.get(req.params.id);
  if (!book) return res.status(404).json({ error: "BOOK_NOT_FOUND" });
  res.json(book);
});

// (optional) create/update to feel real
app.post("/books", (req, res) => {
  const { id, title, author, priceCents } = req.body || {};
  if (!id || !title || !author || !Number.isInteger(priceCents) || priceCents <= 0) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }
  books.set(id, { id, title, author, priceCents });
  res.status(201).json(books.get(id));
});

app.listen(PORT, () => console.log(`${SERVICE} listening onnn ${PORT}`));
