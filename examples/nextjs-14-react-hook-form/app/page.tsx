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
        <p className="max-w-[700px] text-lg text-muted-foreground">
          An example of how to protect your forms from abuse & spam signups with{" "}
          <Link href="https://arcjet.com">Arcjet</Link>.
        </p>
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
      </div>
      <h2 className="text-xl font-bold">Sign up for our newsletter</h2>
      <div className="flex gap-4">
        <EmailForm />
      </div>
    </section>
  );
}