<a href="https://arcjet.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img alt="Arcjet" height="128" src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" width="auto">
  </picture>
</a>

# Arcjet + React Router

This example shows how to use Arcjet in a
[React Router](https://reactrouter.com) app.

> 👉 **Note**:
> see the similar example [`react-router-middleware/`](../react-router-middleware/)
> for Arcjet + React Router using middleware (`future.v8_middleware`).

## Use

Clone the monorepo, then:

```sh
cd arcjet-js
npm ci
cd examples/react-router/
npm ci
```

Rename `.env.example` to `.env` and add your Arcjet key.
Then:

```sh
npm run dev
```

Now visit `http://localhost:5173/` in a browser and follow the steps
explained there.
