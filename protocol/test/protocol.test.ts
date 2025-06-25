import assert from "node:assert/strict";
import test from "node:test";
import { ArcjetIpDetails, ArcjetReason, ArcjetRuleResult } from "../index.js";
import { IpDetails } from "../proto/decide/v1alpha1/decide_pb.js";

test("protocol", async (t) => {
  await t.test("ArcjetRuleResult", async (t) => {
    await t.test("ArcjetRuleResult#isDenied", () => {
      const result = new ArcjetRuleResult({
        conclusion: "ALLOW",
        fingerprint: "fingerprint",
        reason: new ArcjetReason(),
        ruleId: "rule-id",
        state: "RUN",
        ttl: 0,
      });

      assert.equal(result.isDenied(), false);
    });
  });

  await t.test("ArcjetIpDetails", async (t) => {
    const ipDetails = new ArcjetIpDetails(
      new IpDetails({
        asnCountry: "a",
        asnDomain: "b",
        asnName: "c",
        asnType: "d",
        asn: "e",
        city: "f",
        continentName: "g",
        continent: "h",
        countryName: "i",
        country: "j",
        latitude: 40.7127,
        longitude: 74.0059,
        postalCode: "k",
        region: "l",
        service: "m",
        timezone: "America/New_York",
      }),
    );

    await t.test("hasASN", () => {
      assert.equal(ipDetails.hasASN(), true);
    });

    await t.test("hasAccuracyRadius", () => {
      assert.equal(ipDetails.hasAccuracyRadius(), true);
    });

    await t.test("hasCity", () => {
      assert.equal(ipDetails.hasCity(), true);
    });

    await t.test("hasContintent", () => {
      assert.equal(ipDetails.hasContintent(), true);
    });

    await t.test("hasCountry", () => {
      assert.equal(ipDetails.hasCountry(), true);
    });

    await t.test("hasLatitude", () => {
      assert.equal(ipDetails.hasLatitude(), true);
    });

    await t.test("hasLongitude", () => {
      assert.equal(ipDetails.hasLongitude(), true);
    });

    await t.test("hasPostalCode", () => {
      assert.equal(ipDetails.hasPostalCode(), true);
    });

    await t.test("hasRegion", () => {
      assert.equal(ipDetails.hasRegion(), true);
    });

    await t.test("hasService", () => {
      assert.equal(ipDetails.hasService(), true);
    });

    await t.test("hasTimezone", () => {
      assert.equal(ipDetails.hasTimezone(), true);
    });

    await t.test("isHosting", () => {
      assert.equal(ipDetails.isHosting(), false);
    });

    await t.test("isProxy", () => {
      assert.equal(ipDetails.isProxy(), false);
    });

    await t.test("isRelay", () => {
      assert.equal(ipDetails.isRelay(), false);
    });

    await t.test("isTor", () => {
      assert.equal(ipDetails.isTor(), false);
    });

    await t.test("isVpn", () => {
      assert.equal(ipDetails.isVpn(), false);
    });
  });
});
