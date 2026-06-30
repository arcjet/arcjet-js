import assert from "node:assert/strict";
import test from "node:test";
import {
  creditCardRecognizer,
  defaultRecognizers,
  emailRecognizer,
  ipAddressRecognizer,
  phoneRecognizer,
  runRecognizers,
  ssnRecognizer,
  urlRecognizer,
} from "../recognizers.js";

test("emailRecognizer matches addresses with offsets", function () {
  const value = "contact alex@example.com now";
  const spans = emailRecognizer(value);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].type, "EMAIL");
  assert.equal(value.slice(spans[0].start, spans[0].end), "alex@example.com");
});

test("urlRecognizer matches http and www URLs", function () {
  const spans = urlRecognizer("see https://example.com/x and www.test.org");
  assert.deepEqual(
    spans.map((s) => s.type),
    ["URL", "URL"],
  );
});

test("ipAddressRecognizer matches IPv4 and IPv6", function () {
  const v4 = ipAddressRecognizer("from 192.168.1.1 today");
  assert.equal(v4.length, 1);
  assert.equal(v4[0].type, "IP_ADDRESS");

  const v6 = ipAddressRecognizer("addr 2001:db8::ff00:42:8329 end");
  assert.equal(v6.length, 1);
  assert.equal(v6[0].type, "IP_ADDRESS");
});

test("ipAddressRecognizer matches compressed IPv6 and the loopback", function () {
  for (const value of ["ping 2001:db8::1 now", "host ::1 ok"]) {
    const spans = ipAddressRecognizer(value);
    assert.equal(spans.length, 1, value);
    assert.equal(spans[0].type, "IP_ADDRESS");
  }
});

test("ipAddressRecognizer does not match colon text that isn't an IP", function () {
  // Clock times, ratios, and scope resolution are not IPv6 addresses.
  for (const value of [
    "meeting at 12:34:56 pm",
    "ratio 1:2:3:4",
    "std::vector and foo::bar",
  ]) {
    assert.deepEqual(ipAddressRecognizer(value), [], value);
  }
});

test("ssnRecognizer matches dashed SSNs only", function () {
  const spans = ssnRecognizer("ssn 472-81-0094 here");
  assert.equal(spans.length, 1);
  assert.equal(spans[0].type, "SSN");
  assert.equal(ssnRecognizer("no ssn 12345 here").length, 0);
});

test("creditCardRecognizer requires a valid Luhn checksum", function () {
  // Valid test Visa number (passes Luhn).
  const valid = creditCardRecognizer("card 4111 1111 1111 1111 ok");
  assert.equal(valid.length, 1);
  assert.equal(valid[0].type, "CREDIT_CARD_NUMBER");
  assert.equal(valid[0].end - valid[0].start, "4111 1111 1111 1111".length);

  // Same length but fails Luhn.
  assert.equal(creditCardRecognizer("card 4111 1111 1111 1112 no").length, 0);

  // A card with high digits in doubled positions exercises the >9 carry in the
  // Luhn checksum (e.g. a doubled 5 -> 10 -> 1).
  const carry = creditCardRecognizer("pay 5555 5555 5555 4444 now");
  assert.equal(carry.length, 1);
  assert.equal(carry[0].type, "CREDIT_CARD_NUMBER");
});

test("phoneRecognizer requires 7-15 digits", function () {
  const spans = phoneRecognizer("call +1 (415) 555-2671 please");
  assert.equal(spans.length, 1);
  assert.equal(spans[0].type, "PHONE_NUMBER");

  // Too few digits.
  assert.equal(phoneRecognizer("ext 12 34").length, 0);
});

test("runRecognizers runs the default set over text", function () {
  const value = "alex@example.com / 472-81-0094";
  const types = runRecognizers(value).map((s) => s.type);
  // Raw recognizer output may overlap (the phone matcher also matches the SSN
  // digits); the backend resolves overlaps later via precedence.
  assert.ok(types.includes("EMAIL"));
  assert.ok(types.includes("SSN"));
});

test("runRecognizers accepts a custom recognizer list", function () {
  const spans = runRecognizers("alex@example.com 472-81-0094", [ssnRecognizer]);
  assert.deepEqual(
    spans.map((s) => s.type),
    ["SSN"],
  );
});

test("defaultRecognizers covers the structured types", function () {
  assert.equal(defaultRecognizers.length, 6);
});
