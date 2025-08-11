import assert from "node:assert/strict";
import test from "node:test";
import { ArcjetIpDetails } from "../index.js";

test("ArcjetIpDetails", async function (t) {
  await t.test("hasASN", function () {
    const details = createIpDetails();

    if (details.hasASN()) {
      const asnCountry_: string = details.asnCountry;
      const asnDomain_: string = details.asnDomain;
      const asnName_: string = details.asnName;
      const asnType_: string = details.asnType;
      const asn_: string = details.asn;
    } else {
      assert.fail();
    }
  });

  await t.test("hasAccuracyRadius", function () {
    const details = createIpDetails();

    if (details.hasAccuracyRadius()) {
      const accuracyRadius_: number = details.accuracyRadius;
      const latitude_: number = details.latitude;
      const longitude_: number = details.longitude;
    } else {
      assert.fail();
    }
  });

  await t.test("hasCity", function () {
    const details = createIpDetails();

    if (details.hasCity()) {
      const city_: string = details.city;
    } else {
      assert.fail();
    }
  });

  await t.test("hasContintent", function () {
    const details = createIpDetails();

    if (details.hasContintent()) {
      const continentName_: string = details.continentName;
      const continent_: string = details.continent;
    } else {
      assert.fail();
    }
  });

  await t.test("hasCountry", function () {
    const details = createIpDetails();

    if (details.hasCountry()) {
      const countryName_: string = details.countryName;
      const country_: string = details.country;
    } else {
      assert.fail();
    }
  });

  await t.test("hasLatitude", function () {
    const details = createIpDetails();

    if (details.hasLatitude()) {
      const accuracyRadius_: number = details.accuracyRadius;
      const latitude_: number = details.latitude;
      // TODO(#4884): fix.
      const longitude_: number | undefined = details.longitude;
    } else {
      assert.fail();
    }
  });

  await t.test("hasLongitude", function () {
    const details = createIpDetails();

    if (details.hasLongitude()) {
      const accuracyRadius_: number = details.accuracyRadius;
      // TODO(#4884): fix.
      const latitude_: number | undefined = details.latitude;
      const longitude_: number = details.longitude;
    } else {
      assert.fail();
    }
  });

  await t.test("hasPostalCode", function () {
    const details = createIpDetails();

    if (details.hasPostalCode()) {
      const postalCode_: string = details.postalCode;
    } else {
      assert.fail();
    }
  });

  await t.test("hasRegion", function () {
    const details = createIpDetails();

    if (details.hasRegion()) {
      const region_: string = details.region;
    } else {
      assert.fail();
    }
  });

  await t.test("hasService", function () {
    const details = createIpDetails();

    // Not defined on our example.
    if (details.hasService()) {
      assert.fail();
    }
  });

  await t.test("hasTimezone", function () {
    const details = createIpDetails();

    if (details.hasTimezone()) {
      const timezone_: string = details.timezone;
    } else {
      assert.fail();
    }
  });

  await t.test("isHosting", function () {
    const details = createIpDetails();
    assert.equal(details.isHosting(), false);
  });

  await t.test("isProxy", function () {
    const details = createIpDetails();
    assert.equal(details.isProxy(), false);
  });

  await t.test("isRelay", function () {
    const details = createIpDetails();
    assert.equal(details.isRelay(), false);
  });

  await t.test("isTor", function () {
    const details = createIpDetails();
    assert.equal(details.isTor(), false);
  });

  await t.test("isVpn", function () {
    const details = createIpDetails();
    assert.equal(details.isVpn(), false);
  });
});

function createIpDetails(): ArcjetIpDetails {
  // Example from an IP by GH: `185.199.108.153`.
  return new ArcjetIpDetails({
    accuracyRadius: 2,
    asnName: "Fastly, Inc.",
    asnDomain: "fastly.com",
    asn: "54113",
    city: "Uniontown",
    continentName: "North America",
    continent: "NA",
    countryName: "United States",
    country: "US",
    isHosting: false,
    isProxy: false,
    isRelay: false,
    isTor: false,
    isVpn: false,
    latitude: 39.90008,
    longitude: -79.71643,
    postalCode: "15472",
    region: "Pennsylvania",
    service: undefined,
    timezone: "America/New_York",
  });
}
