"use client"
import { authClient } from "@/auth-client"; //import the auth client
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const router = useRouter();

    const signUp = async () => {
        const { data, error } = await authClient.signUp.email({
            email,
            password,
            name
        }, {
            onRequest: (ctx) => {
                //show loading
            },
            onSuccess: (ctx) => {
                router.push("/");
            },
            onError: (ctx) => {
                alert(ctx.error.message);
            },
        });
    };

    return (
        <div>
            <h2>Sign up</h2>
            <label htmlFor="name">Name</label>
            <input type="name" value={name} onChange={(e) => setName(e.target.value)} /><br />
            <label htmlFor="password">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><br />
            <label htmlFor="email">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /><br />
            <button onClick={signUp}>Sign Up</button>
        </div>
    );
}