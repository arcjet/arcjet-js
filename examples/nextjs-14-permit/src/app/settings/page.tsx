"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Nav from "../Components/Nav";

const Note = () => (
  <p>
    This page will always return &quot;Access Denied&quot; if you&apos;re logged
    out. If you&apos;re logged in but don&apos;t have &quot;update&quot;
    permissions to the &quot;stats&quot; resource in Permit, you&apos;ll also be
    denied access.
  </p>
);

export default function Settings() {
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((data) => {
        setCanUpdate(data.canUpdate);
        setPermissionsLoaded(true);
      });
  }, []);

  if (!permissionsLoaded) {
    return (
      <main>
        <Nav activeMenu="settings" />
        <Note />
        <h3>Loading...</h3>
      </main>
    );
  }

  if (!canUpdate) {
    return (
      <main>
        <Nav activeMenu="settings" />
        <Note />
        <h3>Access Denied</h3>
        <p>
          Sorry, you are not allowed to access this page. Please contact support
          if you believe this is an error.
        </p>
      </main>
    );
  }

  return (
    <main>
      <Nav activeMenu="settings" />
      <Note />
      <h3>Settings</h3>
      <p>You can see this page because you have permission to update stats.</p>
    </main>
  );
}
