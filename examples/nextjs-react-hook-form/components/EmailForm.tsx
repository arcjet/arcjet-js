"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formSchema } from "@/lib/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function EmailForm() {
  // Allows us to set an error message on the form.
  const {
    setError,
    formState: { errors },
  } = useForm();
  // Used to navigate to the welcome page after a successful form submission.
  const router = useRouter();

  // Set up the form with the Zod schema and a resolver.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "nonexistent@arcjet.ai",
    },
  });

  // Define a submit handler called when the form is submitted. It sends the
  // form data to an API endpoint and redirects to the welcome page on success.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // values is guaranteed to be of the correct type by the Zod schema.
    const result = await fetch("/api/submit", {
      body: JSON.stringify(values),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if the request was successful and redirect to the welcome page if
    // so. Otherwise, set a root error message.
    if (result.ok) {
      router.push("/welcome");
    } else {
      const statusText = result?.statusText || "Service error";
      const error = await result.json();
      const errorMessage = error?.message || statusText;

      setError("root.serverError", {
        message: `We couldn't sign you up: ${errorMessage}`,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email" // The name of the field in the form schema.
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="totoro@example.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Once per week. No spam. Unsubscribe anytime.
              </FormDescription>
              <FormMessage />
              {errors.root?.serverError && (
                <FormMessage>{errors.root.serverError.message}</FormMessage>
              )}
            </FormItem>
          )}
        />
        <Button type="submit">Sign up</Button>
      </form>
    </Form>
  );
}