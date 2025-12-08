import { hasBodyField, matchFilters } from "../index.js";

const tenExpressions = Array.from({ length: 10 }, function (_, index) {
  return "ip.src == 127.0.0." + index;
});

const bodyExpression = 'body ~ "simulated"';
const samples = 10_000;

await bench("bench (simple)", benchSimple);
await bench(
  "bench (read the body every 10th iteration)",
  benchBodyIfNeededFake,
);
await bench(
  "bench (analyze every expression, read the body every 10th time)",
  benchBodyIfNeededReal,
);
await bench("bench (always read the body)", benchAlwaysBody);

async function bench(
  name: string,
  fn: (ip: string) => Promise<number>,
): Promise<undefined> {
  const now = performance.now();
  let iterations = 0;

  for (let i = 0; i < 255; i++) {
    for (let j = 0; j < 255; j++) {
      for (let k = 0; k < 255; k++) {
        for (let l = 0; l < 255; l++) {
          const ip = [i, j, k, l].join(".");
          iterations += await fn(ip);
          if (iterations >= samples) {
            const elapsed = performance.now() - now;
            const per = elapsed / samples;
            console.log(
              "%s: `%s` iterations, total time: `%sms`, time per iteration: `%sms`",
              name,
              iterations,
              elapsed.toFixed(2),
              per.toFixed(2),
            );
            return;
          }
        }
      }
    }
  }
}

function createBody(): Promise<string> {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve("This is a simulated body content.");
    }, 0);
  });
}

// This reads the body every time. The actual speed of this depends on the actual body.
async function benchAlwaysBody(ip: string): Promise<number> {
  const expressions = tenExpressions;
  let count = 0;
  for (const expression of expressions) {
    const body = await createBody();
    await matchFilters(
      { characteristics: [], log: console },
      { ip },
      [expression],
      false,
      body,
    );
    count++;
  }
  return count;
}

// This does not check if the body is needed with WebAssembly.
// It “magically” reads the body every 10th iteration.
async function benchBodyIfNeededFake(ip: string): Promise<number> {
  const expressions = [...tenExpressions.slice(0, 9), bodyExpression];
  let count = 0;
  for (const expression of expressions) {
    const body = expression === bodyExpression ? await createBody() : undefined;
    await matchFilters(
      { characteristics: [], log: console },
      { ip },
      [expression],
      false,
      body,
    );
    count++;
  }
  return count;
}

// This checks if the body is needed by calling into WebAssembly.
// It needs the body every 10th iteration, and thus reads it every 10th iteration.
async function benchBodyIfNeededReal(ip: string): Promise<number> {
  const expressions = [...tenExpressions.slice(0, 9), bodyExpression];
  let count = 0;
  for (const expression of expressions) {
    const body = (await hasBodyField([expression]))
      ? await createBody()
      : undefined;
    await matchFilters(
      { characteristics: [], log: console },
      { ip },
      [expression],
      false,
      body,
    );
    count++;
  }
  return count;
}

// This does nothing with body: just regular normal local expressions.
async function benchSimple(ip: string): Promise<number> {
  const expressions = tenExpressions;
  let count = 0;
  for (const expression of expressions) {
    await matchFilters(
      { characteristics: [], log: console },
      { ip },
      [expression],
      false,
      undefined,
    );
    count++;
  }
  return count;
}
