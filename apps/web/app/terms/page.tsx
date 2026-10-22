const LAST_UPDATED = "October 22, 2026";
const CONTACT_EMAIL = "[add a contact email here]";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-foreground">Terms of Service</h1>
      <p className="mb-8 text-sm text-muted">Last updated {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground [&_h2]:mt-2 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted [&_li]:text-muted">
        <p className="rounded-2xl border border-card-border bg-card p-4 text-xs text-muted">
          This is a plain-language agreement written to reflect how Koino actually works — it isn&rsquo;t a
          substitute for review by a lawyer. Have this reviewed properly before relying on it for a wider public
          launch.
        </p>

        <section>
          <h2>Using Koino</h2>
          <p>By creating an account, you agree to these terms. Koino is a community space, primarily for family and friends to stay connected — please use it the way you&rsquo;d want to be treated by people you care about.</p>
        </section>

        <section>
          <h2>Your account</h2>
          <p>You&rsquo;re responsible for the activity on your account and for keeping your password secure. Provide accurate information when you sign up, and don&rsquo;t impersonate someone else.</p>
          <p>New accounts start as guests, with limited access, until a community leader has had a chance to get to know you (what we call &ldquo;vouching&rdquo;). This is how we keep the public side of the community trustworthy.</p>
        </section>

        <section>
          <h2>Your content</h2>
          <p>You own what you post. By posting on Koino, you give us permission to store and display it to the audience you chose, for as long as your account or that content exists. We don&rsquo;t claim ownership of it, and we don&rsquo;t use it for anything beyond running the service.</p>
          <p>You&rsquo;re responsible for what you post. Don&rsquo;t post anything you don&rsquo;t have the right to share.</p>
        </section>

        <section>
          <h2>What&rsquo;s not allowed</h2>
          <ul className="list-disc pl-5">
            <li>Harassment, hate speech, threats, or targeting another member</li>
            <li>Illegal content, or content that exploits or endangers anyone, especially minors</li>
            <li>Impersonating another person or misrepresenting your identity</li>
            <li>Spam, scams, or using the platform to collect other members&rsquo; information for unrelated purposes</li>
            <li>Attempting to bypass the vouching/moderation system, or creating multiple accounts to evade a suspension</li>
          </ul>
          <p>We have zero tolerance for abusive content or behavior.</p>
        </section>

        <section>
          <h2>Reporting and moderation</h2>
          <p>Any post, comment, or message can be reported directly in the app. Reports go to our community leaders and admins, who can remove content, and suspend or restrict accounts that violate these terms. We try to be fair, but moderation decisions are ultimately at our discretion.</p>
        </section>

        <section>
          <h2>Ending your account</h2>
          <p>You can stop using Koino at any time. We may suspend or remove an account that violates these terms, abuses other members, or compromises the safety of the community.</p>
        </section>

        <section>
          <h2>No warranty</h2>
          <p>Koino is provided &ldquo;as is.&rdquo; We work to keep it running reliably and to review reports promptly, but we can&rsquo;t guarantee the service will be uninterrupted or error-free, and we&rsquo;re not liable for content posted by other members.</p>
        </section>

        <section>
          <h2>Changes to these terms</h2>
          <p>If these terms change in a meaningful way, we&rsquo;ll update the date at the top of this page.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions about these terms? Reach us at {CONTACT_EMAIL}.</p>
        </section>
      </div>
    </main>
  );
}
