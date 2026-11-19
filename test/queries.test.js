// Tests for queries.js. Run them with: npm test
// Each test calls your functions on Riverbend's data (data/*.json, loaded fresh before every test) and checks what
// they give back and what's in the collections afterward. You don't need to change this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startTestDatabase, run, documentsIn, runInTransaction } from "./mongosh-helper.js";
import { sellLastCruiser, sellTwoLights, placeOrder, cancelOrder, restockCanceled } from "../queries.js";

startTestDatabase();

// Checks that a function gave back the result of an update, and returns its modifiedCount.
function modifiedCountOf(answer, name) {
  assert.ok(answer !== null && typeof answer === "object" && "modifiedCount" in answer,
    `${name} should give back the result of an updateOne, with its modifiedCount, but it gave back ${Array.isArray(answer) ? `a list of ${answer.length} documents` : answer}. Use db.<collection>.updateOne( ... ) after return.`);
  return answer.modifiedCount;
}

async function stockOf(productId) {
  return (await documentsIn("products")).find((product) => product._id === productId).stock;
}

async function statusOf(orderId) {
  return (await documentsIn("orders")).find((order) => order._id === orderId).status;
}

test("1) sellLastCruiser: two checkouts at once for the last Riverbend Cruiser, and only one gets it", async () => {
  const answers = await Promise.all([run(sellLastCruiser), run(sellLastCruiser)]);
  const counts = answers.map((answer) => modifiedCountOf(answer, "1) sellLastCruiser")).sort();
  const stock = await stockOf(1);
  assert.deepEqual(counts, [0, 1],
    `1) Of two checkouts for the last Riverbend Cruiser, exactly one should take it (modifiedCount 1) and the other change nothing (modifiedCount 0), but their modifiedCounts were ${counts.join(" and ")}. The stock is now ${stock}.`);
  assert.equal(stock, 0, `1) After two checkouts for the last Riverbend Cruiser, its stock should be 0, but it is ${stock}.`);
});

test("2) sellTwoLights takes 2 Beam 400 Lights from 3, then changes nothing when only 1 is left", async () => {
  const first = modifiedCountOf(await run(sellTwoLights), "2) sellTwoLights");
  const afterFirst = await stockOf(3);
  assert.equal(first, 1, `2) The first sale of 2 Beam 400 Lights should change the stock (modifiedCount 1), but modifiedCount was ${first}.`);
  assert.equal(afterFirst, 1, `2) After selling 2 of the 3 Beam 400 Lights, the stock should be 1, but it is ${afterFirst}.`);
  const second = modifiedCountOf(await run(sellTwoLights), "2) sellTwoLights");
  const afterSecond = await stockOf(3);
  assert.equal(afterSecond, 1,
    `2) A second sale of 2 Beam 400 Lights, with only 1 left, should change nothing, so the stock stays 1, but it is ${afterSecond}. Only take 2 when at least 2 are left.`);
  assert.equal(second, 0, `2) A second sale of 2 Beam 400 Lights, with only 1 left, should give modifiedCount 0, but it gave ${second}.`);
});

test("3) placeOrder writes Leo's order 1005 with the Gravel Runner's name and price copied in", async () => {
  const answer = await run(placeOrder);
  assert.ok(answer !== null && typeof answer === "object" && answer.insertedId === 1005,
    `3) placeOrder should give back { acknowledged: true, insertedId: 1005 } from an insertOne, but it gave back ${Array.isArray(answer) ? `a list of ${answer.length} documents` : JSON.stringify(answer)}.`);
  const order = (await documentsIn("orders")).find((o) => o._id === 1005);
  const shown = {
    ...order,
    orderedOn: order.orderedOn instanceof Date ? `the date ${order.orderedOn.toISOString().slice(0, 10)}` : order.orderedOn,
    lines: order.lines?.map((line) => ({ ...line, price: line.price?._bsontype === "Decimal128" ? `NumberDecimal("${line.price}")` : line.price })),
  };
  assert.deepEqual(shown, {
    _id: 1005,
    customerId: 8,
    status: "placed",
    orderedOn: "the date 2026-11-17",
    lines: [{ productId: 4, name: "Gravel Runner", price: 'NumberDecimal("1199.00")', quantity: 1 }],
  }, "3) Order 1005 should be: customerId 8, status \"placed\", orderedOn the date 2026-11-17 (ISODate(\"2026-11-17\")), and lines holding one line: productId 4, name \"Gravel Runner\", price NumberDecimal(\"1199.00\"), quantity 1.");
});

test("4) cancelOrder cancels order 1004 once, changes nothing the second time, and leaves a shipped order alone", async () => {
  const first = modifiedCountOf(await run(cancelOrder), "4) cancelOrder");
  assert.equal(first, 1, `4) The first cancel of order 1004 should change it (modifiedCount 1), but modifiedCount was ${first}.`);
  assert.equal(await statusOf(1004), "canceled", `4) After cancelOrder, order 1004's status should be "canceled", but it is "${await statusOf(1004)}".`);
  const second = modifiedCountOf(await run(cancelOrder), "4) cancelOrder");
  assert.equal(second, 0,
    `4) A second cancel of order 1004 should change nothing (modifiedCount 0), but modifiedCount was ${second}. Only cancel the order while its status is "placed".`);
  assert.equal(await statusOf(1001), "placed", "4) cancelOrder should change only order 1004, but order 1001 is no longer \"placed\".");

  // Now suppose order 1004 has already shipped: a cancel must leave it alone.
  await run((db) => db.orders.updateOne({ _id: 1004 }, { $set: { status: "shipped" } }));
  const shipped = modifiedCountOf(await run(cancelOrder), "4) cancelOrder");
  const status = await statusOf(1004);
  assert.equal(status, "shipped",
    `4) When order 1004 has already shipped, cancelOrder should change nothing, but its status is now "${status}". Only cancel the order while its status is "placed".`);
  assert.equal(shipped, 0, `4) When order 1004 has already shipped, cancelOrder should give modifiedCount 0, but it gave ${shipped}.`);
});

test("5) restockCanceled puts the 2 Beam 400 Lights back: the stock goes from 3 to 5", async () => {
  modifiedCountOf(await run(restockCanceled), "5) restockCanceled");
  const stock = await stockOf(3);
  assert.equal(stock, 5, `5) After restockCanceled, the Beam 400 Light's stock should be 5 (3 plus the 2 from order 1004), but it is ${stock}.`);
});

test("6) cancelOrder and restockCanceled in one transaction: both changes happen", async () => {
  await runInTransaction([cancelOrder, restockCanceled]);
  const status = await statusOf(1004);
  const stock = await stockOf(3);
  assert.equal(status, "canceled", `6) After the cancel's transaction, order 1004 should be "canceled", but it is "${status}".`);
  assert.equal(stock, 5, `6) After the cancel's transaction, the Beam 400 Light's stock should be 5, but it is ${stock}.`);
});

test("7) a cancel that stops halfway is undone: order 1004 stays placed and the stock stays 3", async () => {
  let statusInside;
  await assert.rejects(runInTransaction([
    cancelOrder,
    async (db) => {
      statusInside = (await db.orders.findOne({ _id: 1004 }))?.status;
      throw new Error("The app stopped halfway through the cancel.");
    },
    restockCanceled,
  ]), /stopped halfway/);
  assert.equal(statusInside, "canceled",
    `7) Inside the transaction, cancelOrder should set order 1004's status to "canceled", but it was "${statusInside}".`);
  const status = await statusOf(1004);
  const stock = await stockOf(3);
  assert.equal(status, "placed", `7) The cancel stopped halfway, so the transaction is undone and order 1004 should still be "placed", but it is "${status}".`);
  assert.equal(stock, 3, `7) The cancel stopped halfway, so the Beam 400 Light's stock should still be 3, but it is ${stock}.`);
});
