import { EmailForm } from "@/components/EmailForm";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Protecting a Next.js React Hook Form with Arcjet.
        </h1>
        <p className="max-w-[700px]">
          This form uses{" "}
          <Link href="https://docs.arcjet.com/signup-protection/quick-start/nextjs" className="underline">
            Arcjet&apos;s signup form protection
          </Link>{" "}
          which includes:
        </p>
        <ul className="ms-8 max-w-[700px] list-outside list-disc">
          <li>
            Server-side email verification with Arcjet to check if the email is
            from a disposable provider and that the domain has a valid MX
            record.
          </li>
          <li>
            Rate limiting set to 5 requests over a 10 minute sliding window - a
            reasonable limit for a signup form, but easily configurable.
          </li>
          <li>
            Bot protection to stop automated clients from submitting the form.
          </li>
        </ul>
      </div>
      <div className="flex gap-4">
        <Link
          href="https://docs.arcjet.com"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Arcjet Documentation
        </Link>
        <Link
          href="https://app.arcjet.com"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Arcjet Dashboard
        </Link>
      </div>
      <h2 className="text-xl font-bold">Sign up for our newsletter</h2>
      <div className="flex gap-4">
        <EmailForm />
      </div>
    </section>
  );
}