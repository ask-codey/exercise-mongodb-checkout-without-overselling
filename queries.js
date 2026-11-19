// Riverbend Bike Shop's checkout: five statements for you to write.
//
// Each function gets `db`, which works like mongosh: db.products is Riverbend's products collection and db.orders its
// orders, the same data as in data/products.json and data/orders.json. A product and an order look like these:
//
//   { _id: 3, name: "Beam 400 Light", type: "light", price: NumberDecimal("34.00"), stock: 3 }
//
//   { _id: 1004, customerId: 9, status: "placed", orderedOn: ISODate("2026-11-16"),
//     lines: [ { productId: 3, name: "Beam 400 Light", price: NumberDecimal("34.00"), quantity: 2 } ] }
//
// An order's status is "placed", "shipped" or "canceled". Each order line keeps a copy of the product's name and the
// price the customer paid.
//
// In each function, replace db.products.find({}) with one mongosh statement of your own, after the word return.
// Every function starts out finding all 6 products, so its test fails until your statement is right.
// You can try a statement in mongosh first (README.md, "Try a statement in mongosh") and paste it in.

// mongosh's helpers for ids, dates and money. placeOrder needs ISODate and NumberDecimal; leave this line as it is.
import { ObjectId, ISODate, NumberDecimal } from "./test/mongosh-helper.js";

/*
 * 1. Riverbend has 1 Riverbend Cruiser (_id 1) left. Take 1 from its stock, but only when at least 1 is left.
 *
 *    The first checkout takes it: modifiedCount 1, and the stock goes from 1 to 0.
 *    A second checkout, even one at the same moment, changes nothing: modifiedCount 0, and the stock stays 0.
 */
export function sellLastCruiser(db) {
  return db.products.find({});
}

/*
 * 2. Sell 2 Beam 400 Lights (_id 3) in one update: take 2 from its stock, but only when at least 2 are left.
 *
 *    The stock starts at 3. The first sale takes 2 (modifiedCount 1, stock 1). A second sale changes nothing
 *    (modifiedCount 0), because only 1 is left: the stock stays 1 and never goes below 0.
 */
export function sellTwoLights(db) {
  return db.products.find({});
}

/*
 * 3. Write Leo's new order into orders, with the product's name and price copied into its line. The order is:
 *
 *    _id 1005, customerId 8, status "placed", orderedOn the date 2026-11-17, and one line: productId 4,
 *    name "Gravel Runner", price 1199.00 as an exact decimal (NumberDecimal("1199.00")), quantity 1.
 *
 *    Gives back { acknowledged: true, insertedId: 1005 }.
 */
export function placeOrder(db) {
  return db.products.find({});
}

/*
 * 4. Cancel Priya's order 1004: set its status to "canceled", but only while its status is still "placed".
 *
 *    The first cancel gives modifiedCount 1. A second cancel gives modifiedCount 0, and the status stays "canceled".
 *    If order 1004 has already shipped (status "shipped"), a cancel gives modifiedCount 0 and the status stays
 *    "shipped".
 */
export function cancelOrder(db) {
  return db.products.find({});
}

/*
 * 5. Put the 2 Beam 400 Lights from Priya's canceled order back in stock: add 2 to the stock of product 3.
 *
 *    The stock goes from 3 to 5.
 *
 *    The tests also run cancelOrder and restockCanceled together in one transaction, as the shop's app does: both
 *    changes happen. And when a cancel stops halfway, after cancelOrder and before restockCanceled, the transaction
 *    is undone: order 1004 is still "placed" and the stock is still 3.
 */
export function restockCanceled(db) {
  return db.products.find({});
}
