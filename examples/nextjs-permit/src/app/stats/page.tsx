"use client";
import { useEffect, useState } from "react";
import { ArcjetRateLimitReason } from "@arcjet/next";
import { SignUpButton, SignInButton, useUser } from "@clerk/nextjs";
import Nav from "../Components/Nav";

type Stats = {
  title: string;
  week: string;
  total_orders: number;
  toppings: {
    name: string;
    orders: number;
  }[];
};

const GuestNotice = () => (
  <div className="notice">
    <p>
      You&apos;re visiting this page as a guest, which means your requests will
      be throttled. To get more regular updates, please <SignUpButton /> or{" "}
      <SignInButton /> with an existing account.
    </p>
  </div>
);

export default function Stats() {
  const user = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ratelimitData, setRatelimitData] =
    useState<ArcjetRateLimitReason | null>(null);

  const loadStats = () => {
    setStats(null);
    setRatelimitData(null);
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.ratelimitData) setRatelimitData(data.ratelimitData);
      });
  };

  useEffect(() => {
    if (user.isLoaded) loadStats();
  }, [user.isLoaded]);

  return (
    <main>
      <Nav activeMenu="stats" />

      <h1>
        Stats
        <button onClick={loadStats}>Refresh ↺</button>
      </h1>

      <p>
        This page renders for everyone, but the rate-limit on the API call
        depends on your logged-in status.
      </p>

      {user.isLoaded && !user.isSignedIn && <GuestNotice />}
      {!stats && !ratelimitData && <p>Loading...</p>}

      {stats && (
        <>
          <h3>{stats.title}</h3>
          <p>Week ending {stats.week}</p>
          <p>Total Orders: {stats.total_orders}</p>
          <ul>
            {stats.toppings
              .sort((a, b) => b.orders - a.orders)
              .map((topping, index) => (
                <li key={index}>
                  {topping.name}: {topping.orders} orders
                </li>
              ))}
          </ul>
        </>
      )}

      {/* The following is for educational use - see what the raw JSON is, and get details  */}
      <div className="behind-the-scenes">
        {ratelimitData && (
          <div className="notice">
            <h3>Rate Limit Data</h3>
            {ratelimitData.type === "RATE_LIMIT" && (
              <p>
                You are limited to <strong>{ratelimitData.max}</strong> requests
                every <strong>{ratelimitData.window}</strong> seconds. You have{" "}
                <strong>{ratelimitData.remaining}</strong> request remaining
                before you&apos;ll be rate limited.
                <pre>{JSON.stringify(ratelimitData, null, 2)}</pre>
              </p>
            )}
            {ratelimitData.type !== "RATE_LIMIT" && (
              <p>Your requests are not rate limited.</p>
            )}
          </div>
        )}
        {stats && (
          <div className="notice">
            <h3>Raw Stats JSON</h3>
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
