<a href="https://nosecone.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@nosecone/next`

<p>
  <a href="https://www.npmjs.com/package/@nosecone/next">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40nosecone%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40nosecone%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Protect your Next.js application with secure headers.

- [npm package (`@nosecone/next`)](https://www.npmjs.com/package/@nosecone/next)
- [GitHub source code (`nosecone-next/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/nosecone-next)

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @nosecone/next
```

## Use

Configure Nosecone in a `middleware.ts` file:

```ts
import { createMiddleware } from "@nosecone/next";

export const config = {
  // matcher tells Next.js to run middleware on all routes
  matcher: ["/(.*)"],
};

export default createMiddleware();
```

…then use `connection` from `next/server` in `app/layout.tsx`:

```diff
+import { connection } from "next/server";

 export default async function RootLayout({
   children,
 }: {
   children: React.ReactNode;
 }) {
+  // Opt-out of static generation for every page so the CSP nonce can be applied
+  await connection()

   return (
     <html lang="en">
       <body className={inter.className}>{children}</body>
     </html>
   );
 }
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
