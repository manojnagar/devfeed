/**
 * @file Post title + summary templates used to generate seed posts.
 *
 * The store generates ~3 posts per publisher by zipping a publisher
 * with rotating slots from this template list. Output is deterministic
 * so dev mode behaves identically across server restarts and tests.
 */

export interface PostTemplate {
  title: string;
  summary: string;
  tagSlugs: string[];
  readingTimeMin: number;
  accessLabel: "free" | "paid" | "members_only" | "mixed";
  /**
   * Optional sample HTML body. When set, the seed builder treats it as
   * if the publisher's RSS shipped a `<content:encoded>` block — the
   * content is sanitized and stored on the post row with
   * `body_source='feed'`. Used to demo the inline reader path against
   * the dev seed (where most synthetic URLs would otherwise 404).
   */
  body?: string;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    title: "Cutting tail latency on our hot path with adaptive load shedding",
    summary:
      "How we replaced fixed-rate limiters with an adaptive controller that watches p99 latency and sheds 0.1% of traffic before things go bad.",
    tagSlugs: ["distributed-systems", "performance", "observability"],
    readingTimeMin: 12,
    accessLabel: "free",
    body: `<p>Adaptive load shedding sounds straightforward on paper: when the system is healthy, accept everything; when it isn't, drop the fraction of traffic that lets every other request finish on time. In practice, the trick is picking the right signal and the right reaction curve so the system never oscillates between "everything is fine" and "drop half the traffic".</p>
<h2>The signal: p99 latency, not queue depth</h2>
<p>We started with queue depth as our shedding signal, the way most off-the-shelf rate limiters do. It worked under synthetic load and broke spectacularly under real load. The problem: queue depth is downstream of the bottleneck. By the time it climbs, the latency tail has already detached from the body of the histogram, and our SLOs are gone for the next five minutes.</p>
<p>Switching to a moving p99 latency signal reordered the failure mode. p99 climbs <em>before</em> the queue does — usually about 200ms before, depending on the service. We now have a window to act in.</p>
<h2>The controller: PID, lightly tuned</h2>
<p>The controller is a vanilla PID with three knobs: target p99 (per-route, configured in the deployment manifest), proportional gain, and integral gain. Derivative gain is zero — the latency series is too noisy for a derivative term to help. Output is the percentage of incoming requests to shed, clamped to [0, 5].</p>
<p>Two implementation details mattered more than the math:</p>
<ul>
  <li><strong>Per-route targets.</strong> Our login endpoint has a 50ms p99 target; our search endpoint has a 400ms target. A single global controller would be useless.</li>
  <li><strong>Shed by request priority, not at random.</strong> Each request carries a priority header set by the upstream service. We shed lowest-priority first. This kept the user-facing latency for paying customers ~unchanged during the rollout.</li>
</ul>
<h2>What we measured after a month</h2>
<p>p99 across the top 20 endpoints is down 23%. Total CPU usage is up 1.5% — the controller does have a cost — but we eliminated all five of our auto-scale-driven incidents from the last quarter. We consider that a clear win, and the team is now porting the same approach to two adjacent services.</p>
<p>If you want to try this yourself, the open-source reference implementation we extracted from the production codebase is on GitHub. It is small enough to read in one sitting.</p>`,
  },
  {
    title: "Migrating from a 4 TB Postgres to logical replication without downtime",
    summary:
      "A step-by-step account of how we cut over a multi-terabyte primary while keeping reads serving production traffic.",
    tagSlugs: ["databases", "infrastructure"],
    readingTimeMin: 18,
    accessLabel: "free",
  },
  {
    title: "What we learned shipping React Server Components in production",
    summary:
      "Six months in: bundle wins, hydration foot-guns, and the patterns we wish we'd known on day one.",
    tagSlugs: ["react", "frontend", "performance"],
    readingTimeMin: 9,
    accessLabel: "free",
  },
  {
    title: "Designing a vector index for 50 million embeddings on a single box",
    summary:
      "How we shrank a 12-node ANN cluster to a single tuned EC2 instance with no recall regression.",
    tagSlugs: ["ml-ai", "performance", "databases"],
    readingTimeMin: 14,
    accessLabel: "paid",
  },
  {
    title: "How our incident-review process stopped feeling like a punishment",
    summary:
      "We rewrote our postmortem template, killed three meetings, and finally got engineers volunteering to lead reviews.",
    tagSlugs: ["incident-response", "engineering-culture"],
    readingTimeMin: 7,
    accessLabel: "free",
  },
  {
    title: "Building a typed RPC layer on top of HTTP/3 and QUIC",
    summary:
      "The protocol design, the wire format, and why we left gRPC behind.",
    tagSlugs: ["networking", "architecture", "performance"],
    readingTimeMin: 16,
    accessLabel: "free",
  },
  {
    title: "Tracking flakiness across 80,000 e2e tests",
    summary:
      "A small dataset job + a dashboard turned a years-old morale problem into something we can measure.",
    tagSlugs: ["testing", "devex", "observability"],
    readingTimeMin: 8,
    accessLabel: "free",
  },
  {
    title: "Hardening our build pipeline against malicious dependencies",
    summary:
      "SBOMs, sigstore signing, registry pinning, and the boring-but-essential package-lock policy that finally stuck.",
    tagSlugs: ["security", "devex"],
    readingTimeMin: 11,
    accessLabel: "free",
  },
  {
    title: "From monolith to two services: an honest retrospective",
    summary:
      "We extracted exactly one service in twelve months. Here's what worked, what didn't, and what we'd skip.",
    tagSlugs: ["architecture", "engineering-culture"],
    readingTimeMin: 13,
    accessLabel: "members_only",
  },
  {
    title: "Why we picked SQLite as our primary store for an internal tool",
    summary:
      "It runs everything we need, costs nothing, and is impossible to break in interesting ways.",
    tagSlugs: ["databases", "platform-engineering"],
    readingTimeMin: 6,
    accessLabel: "free",
  },
  {
    title: "A month of fuzzing: ten bugs, no production incidents",
    summary:
      "How we wired libFuzzer into our CI and the bugs it caught that nothing else did.",
    tagSlugs: ["security", "testing"],
    readingTimeMin: 9,
    accessLabel: "free",
  },
  {
    title: "Replacing a hand-tuned cache with a learned policy",
    summary:
      "Two weeks of A/B tests, one Bayesian-bandit policy, and a 14% hit-rate improvement.",
    tagSlugs: ["performance", "ml-ai", "redis"],
    readingTimeMin: 10,
    accessLabel: "paid",
  },
];
