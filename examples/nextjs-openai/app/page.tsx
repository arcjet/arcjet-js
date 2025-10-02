"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage} = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((m) => (
        <div key={m.id} className="whitespace-pre-wrap">
          {m.role === "user" ? (
            <>
              👤 <strong>User:</strong>{" "}
            </>
          ) : (
            <>
              🤖 <strong>AI:</strong>{" "}
            </>
          )}
          {m.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${m.id}-${i}`}>{part.text}</div>;
            }
          })}
        </div>
      ))}

      <form onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl dark: border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
