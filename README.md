# Exercise: Checkout Without Overselling

Exercise code for the lesson **Exercise: Checkout Without Overselling** in the MongoDB in Depth course on [ask-codey.com](https://www.ask-codey.com).

Riverbend Bike Shop's online store needs a checkout that never sells what it doesn't have, even when two shoppers press the button at the same moment, and a cancel that puts the stock back. You'll write five mongosh statements in `queries.js`: two conditional stock updates, an order with its prices copied in, a cancel, and a restock. The tests run them on Riverbend's data, two at once where it matters, and inside a transaction for the cancel.

## What's here

- `queries.js`: the five functions, each returning `db.products.find({})` for now. The comment above each one says exactly what it should do and what it gives back. For you to finish.
- `data/products.json`, `data/orders.json` and `data/customers.json`: Riverbend's 6 products, 4 orders and 3 customers. Ready to use.
- `data/load-into-mongosh.js`: loads that data into mongosh, so you can try a statement there first. Ready to use.
- `test/queries.test.js`: the tests that run your statements. You don't need to change this file.
- `test/mongosh-helper.js`: the helper that runs your mongosh statements for the tests, with a throwaway MongoDB. In this exercise the throwaway MongoDB is a replica set with one member, because transactions need one, and the helper can run your functions inside a transaction. You don't need to read or change it.
- `package.json`: the packages the tests use, and the MongoDB version they download if your computer has none. Ready to use.

The word `export` in front of each function lets the tests use it, and the `import` line at the top of `queries.js` brings in mongosh's helpers: `placeOrder` needs `ISODate` and `NumberDecimal`. Leave both as they are.

## Before you start

In VS Code's terminal, in this folder, install the packages the tests use (once):

```bash
npm install
```

## Try a statement in mongosh

Every answer is one mongosh statement, so you can try it at the mongosh prompt before you paste it in. Start mongosh in this folder, choose a practice database, and load Riverbend's data:

```bash
mongosh
```

```mongodb
use checkout_practice
load("data/load-into-mongosh.js")
```

It prints a line for each collection, such as `products: 6 documents`, then `true`. Try a statement, check what it changed with `db.products.findOne({ _id: 1 })`, and run the `load` line again whenever you want the data back as it started. Type `exit` when you're done. Your conditional updates work on any MongoDB server; only the transaction needs a replica set, and the tests start their own.

## Check your work

```bash
npm test
```

At first every test fails: that is expected. Each statement you finish turns its test green, and tests 6 and 7 turn green when `cancelOrder` and `restockCanceled` both work. A failing test's message says what it expected and what happened, for example *1) Of two checkouts for the last Riverbend Cruiser, exactly one should take it (modifiedCount 1) and the other change nothing (modifiedCount 0), but their modifiedCounts were 1 and 1. The stock is now -1.*

The tests start their own throwaway MongoDB, so they never touch your databases. If you installed MongoDB on your computer in the course's setup lesson, the tests use it. If you didn't, the first `npm test` downloads MongoDB 9.0.8 for the tests (nearly 1 GB on Windows, about 180 MB on a Mac) and keeps it for every exercise after this one.

## The rules

- Write one mongosh statement in each function, after the word `return`, such as `return db.products.updateOne({ _id: 2 }, { $set: { stock: 12 } });`.
- Put each check in the update's filter, so the check and the change happen as one step. Don't read the stock first and decide afterward.
- `placeOrder` writes the price as an exact decimal with `NumberDecimal("1199.00")` and the date with `ISODate("2026-11-17")`.

## What the tests check

1. `sellLastCruiser`, run twice at the same moment: one gives `modifiedCount` 1, the other 0, and the Riverbend Cruiser's stock ends at 0.
2. `sellTwoLights`, run twice: the first gives `modifiedCount` 1 and leaves 1 Beam 400 Light, the second gives 0 and the stock stays 1.
3. `placeOrder`: gives back `insertedId: 1005`, and order 1005 is exactly the order its comment describes.
4. `cancelOrder`: the first cancel gives `modifiedCount` 1 and order 1004 is `"canceled"`; a second gives 0; order 1001 stays `"placed"`; and when order 1004 has already shipped, a cancel gives 0 and its status stays `"shipped"`.
5. `restockCanceled`: the Beam 400 Light's stock goes from 3 to 5.
6. `cancelOrder` and `restockCanceled` run together in one transaction: order 1004 is `"canceled"` and the stock is 5.
7. A cancel that stops halfway, after `cancelOrder` and before `restockCanceled`: inside the transaction the order was `"canceled"`, and afterward the transaction is undone, so order 1004 is still `"placed"` and the stock is still 3.

## Tips

- Say the rule in words first: "take 1, but only when at least 1 is left" is a filter on `stock` and an `$inc` with -1.
- Two of anything needs "at least 2" in the filter, not "at least 1".
- `modifiedCount` is how the app knows whether the checkout worked: 1 means it did, 0 means nothing matched.
- A cancel's "only while placed" is a second field in its filter.

## Hand it in

When it works, push your solution to a public repo of your own on GitHub, then paste that repo's address into **Submit your exercise** on the lesson page at [ask-codey.com](https://www.ask-codey.com). That's what completes the lesson. The lesson page shows the Git commands, step by step.
