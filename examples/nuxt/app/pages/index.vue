<script setup lang="ts">
  import { FetchError } from "ofetch";

  let message = ref<string | undefined>();

  async function onSubmit(event: SubmitEvent) {
    try {
      message.value = await $fetch("/api/submit", {
        body: new FormData(event.target as HTMLFormElement),
        method: "POST",
      });
    } catch (cause) {
      if (!(cause instanceof FetchError)) {
        throw new Error("Failed to fetch /api/submit", { cause });
      }
      message.value = cause.data.statusMessage;
    }
  }
</script>

<template>
  <form className="main" @submit.prevent="onSubmit">
    <h1>Arcjet + Nuxt</h1>
    <h2>Rate limit</h2>
    <p>
      Submit 5 times in 10 seconds and you will be blocked; after that you can
      submit again.
    </p>
    <h2>Sensitive info</h2>
    <p>
      Post with and without sensitive info (IP addresses, emails, and more) in
      the text area below. The request body is analyzed entirely on your server:
      no sensitive info is sent to Arcjet.
    </p>
    <textarea cols="80" name="text" rows="3">
Some IP address 192.168.1.1 and an email user@example.com.</textarea
    >
    <div className="footer">
      <button type="submit">Check sensitive info</button>
      <span v-if="message">{{ message }}</span>
    </div>
  </form>
</template>
