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
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    title: "Cutting tail latency on our hot path with adaptive load shedding",
    summary:
      "How we replaced fixed-rate limiters with an adaptive controller that watches p99 latency and sheds 0.1% of traffic before things go bad.",
    tagSlugs: ["distributed-systems", "performance", "observability"],
    readingTimeMin: 12,
    accessLabel: "free",
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
