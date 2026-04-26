/**
 * @file Person publisher seed data.
 *
 * The five example individual authors from `PLAN.md §7`. Each becomes
 * a `publishers` row with `type='person'` plus a feed source.
 */

export interface PersonSeed {
  slug: string;
  name: string;
  websiteUrl: string;
  feedUrl: string;
  description: string;
  twitterHandle: string | null;
  githubHandle: string | null;
}

export const PERSON_SEEDS: PersonSeed[] = [
  {
    slug: "dan-abramov",
    name: "Dan Abramov",
    websiteUrl: "https://overreacted.io/",
    feedUrl: "https://overreacted.io/rss.xml",
    description: "A blog by Dan Abramov on React, JavaScript, and software design.",
    twitterHandle: "dan_abramov",
    githubHandle: "gaearon",
  },
  {
    slug: "dhh",
    name: "DHH",
    websiteUrl: "https://world.hey.com/dhh",
    feedUrl: "https://world.hey.com/dhh/feed.atom",
    description: "David Heinemeier Hansson — Ruby on Rails, business, and contrarian takes.",
    twitterHandle: "dhh",
    githubHandle: "dhh",
  },
  {
    slug: "julia-evans",
    name: "Julia Evans",
    websiteUrl: "https://jvns.ca/",
    feedUrl: "https://jvns.ca/atom.xml",
    description: "Wizard zines and posts on debugging, Linux, networking, and computing.",
    twitterHandle: "b0rk",
    githubHandle: "jvns",
  },
  {
    slug: "charity-majors",
    name: "Charity Majors",
    websiteUrl: "https://charity.wtf/",
    feedUrl: "https://charity.wtf/feed/",
    description: "Observability, on-call, and engineering leadership from the Honeycomb co-founder.",
    twitterHandle: "mipsytipsy",
    githubHandle: "charity",
  },
  {
    slug: "patio11",
    name: "Patrick McKenzie",
    websiteUrl: "https://www.kalzumeus.com/",
    feedUrl: "https://www.kalzumeus.com/feed/",
    description: "Software, business, salary negotiation, and the financial system.",
    twitterHandle: "patio11",
    githubHandle: "patio11",
  },
];
