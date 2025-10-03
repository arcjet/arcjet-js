"use client"

import { useActionState } from "react";

import { validate } from "./actions";
import styles from "./page.module.css";


interface FormState {
  message: string
}

const initialState: FormState = {
  message: '',
}

export default function Home() {
  const [state, formAction] = useActionState(validate, initialState)

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <form action={formAction}>
          <p>
            <label>Email: <input type="text" name="email" required /></label>
          </p>
          <p aria-live="polite">{state?.message}</p>
          <button type="submit">Validate Email</button>
        </form>
      </main>
    </div>
  );
}
