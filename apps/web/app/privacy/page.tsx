const LAST_UPDATED = "October 22, 2026";
const CONTACT_EMAIL = "[add a contact email here]";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-foreground">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted">Last updated {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground [&_h2]:mt-2 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted [&_li]:text-muted">
        <p className="rounded-2xl border border-card-border bg-card p-4 text-xs text-muted">
          This is a plain-language policy written to describe, honestly, what Koino actually collects and does with
          it — it isn&rsquo;t a substitute for review by a lawyer. If Koino grows beyond a small community or starts
          operating somewhere with specific privacy regulations (like GDPR or CCPA), have this reviewed properly
          before relying on it.
        </p>

        <section>
          <h2>What we collect</h2>
          <p>When you create an account, we collect your email address, password (stored securely by our auth provider, never in plain text), and the username you choose.</p>
          <p>You can optionally add to your profile: a display name, bio, about-me text, avatar photo, gender, birthday, location, hobbies, a favorite Bible verse, and visual customization choices (colors, fonts, layout).</p>
          <p>Content you create: posts (text, photos, videos), comments, likes, messages you send, and the family/friend connections you make with other members (including the relationship labels you choose, like &ldquo;mother&rdquo; or &ldquo;cousin&rdquo;).</p>
          <p>We also keep a basic record of your activity on the platform — things like who you&rsquo;ve viewed, what you&rsquo;ve liked, and reports you&rsquo;ve filed or that have been filed about your content — so moderation and features like &ldquo;who viewed your profile&rdquo; can work.</p>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>To run the service: show your posts to the audience you chose (public, friends, or family), connect you with the people you add as friends or family, deliver messages, and show you relevant notifications.</p>
          <p>To keep the community safe: review reported content, and — for new members — have a community leader get to know you a little before you can post publicly (we call this &ldquo;vouching&rdquo;).</p>
          <p>We don&rsquo;t sell your data, and we don&rsquo;t use it for advertising.</p>
        </section>

        <section>
          <h2>Who can see what</h2>
          <p>Koino has three audiences for posts: <strong>Public</strong> (anyone on Koino), <strong>Friends</strong> (people you&rsquo;ve confirmed as friends or family — family counts as friends too), and <strong>Family</strong> (people you&rsquo;ve confirmed as family specifically). You choose the audience each time you post.</p>
          <p>Your profile&rsquo;s basic info (username, display name, avatar, and whatever you&rsquo;ve chosen to fill in) is visible to anyone who visits your profile page.</p>
          <p>Direct messages are only ever visible to the people in that conversation — not even our moderation team can read message content, except the specific message being reported when someone files a report about it.</p>
        </section>

        <section>
          <h2>Who we share it with</h2>
          <p>We use third-party infrastructure providers to run Koino — currently Supabase (database, authentication, and file storage) and Vercel (hosting). They process your data on our behalf, under their own security and privacy commitments, and don&rsquo;t use it for their own purposes.</p>
          <p>We don&rsquo;t share your data with advertisers, data brokers, or anyone else outside of keeping the service running.</p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>We keep your data for as long as your account is active. If you&rsquo;d like your account and the data tied to it deleted, contact us and we&rsquo;ll remove it, aside from anything we&rsquo;re required to retain (like records of safety-related moderation actions).</p>
        </section>

        <section>
          <h2>Security</h2>
          <p>Passwords are hashed and managed by our authentication provider — nobody at Koino, including us, can see your actual password. We take reasonable steps to protect your data, but no online service can guarantee perfect security.</p>
        </section>

        <section>
          <h2>Children&rsquo;s privacy</h2>
          <p>Koino isn&rsquo;t directed at children under 13, and we don&rsquo;t knowingly collect information from them. If you believe a child has created an account, contact us and we&rsquo;ll remove it.</p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>If this policy changes in a meaningful way, we&rsquo;ll update the date at the top of this page.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions about this policy or your data? Reach us at {CONTACT_EMAIL}.</p>
        </section>
      </div>
    </main>
  );
}
