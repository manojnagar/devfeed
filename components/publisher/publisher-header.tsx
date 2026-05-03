/**
 * @file PublisherHeader — variant-aware hero for /publishers/[slug].
 *
 * Two variants per the design spec:
 *   - company: large logo, website link, optional verified badge
 *   - person:  same plus social handles + bio prominent
 *
 * Renders followAction as a slot so the auth state can be resolved by
 * the parent page rather than this component.
 */

import { Avatar, Pill } from "@/components/ui";
import { Github, Twitter, Globe, BadgeCheck } from "lucide-react";
import { resolvePublisherLogoCandidates } from "@/lib/publisher-logo";
import type { Publisher } from "@/lib/types";

export interface PublisherHeaderProps {
  publisher: Publisher;
  followAction?: React.ReactNode;
  postCount: number;
}

function SocialLinks({ publisher }: { publisher: Publisher }) {
  const links: Array<{ href: string; label: string; icon: React.ReactNode }> = [];
  if (publisher.websiteUrl) {
    links.push({
      href: publisher.websiteUrl,
      label: "Website",
      icon: <Globe size={16} aria-hidden />,
    });
  }
  if (publisher.twitterHandle) {
    links.push({
      href: `https://twitter.com/${publisher.twitterHandle}`,
      label: `@${publisher.twitterHandle}`,
      icon: <Twitter size={16} aria-hidden />,
    });
  }
  if (publisher.githubHandle) {
    links.push({
      href: `https://github.com/${publisher.githubHandle}`,
      label: publisher.githubHandle,
      icon: <Github size={16} aria-hidden />,
    });
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm text-[rgb(var(--color-fg-muted))]">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-[rgb(var(--color-accent))]"
        >
          {l.icon}
          {l.label}
        </a>
      ))}
    </div>
  );
}

export function PublisherHeader({ publisher, followAction, postCount }: PublisherHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-[rgb(var(--color-line))]">
      <div className="flex items-start gap-4 min-w-0">
        <Avatar
          name={publisher.name}
          src={resolvePublisherLogoCandidates(publisher)}
          size={publisher.type === "person" ? 80 : 64}
          rounded={publisher.type === "person" ? "full" : "md"}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-2xl font-semibold leading-tight">{publisher.name}</h1>
            <Pill
              tone={publisher.type === "person" ? "type-person" : "type-company"}
              size="md"
            >
              {publisher.type === "person" ? "Person" : "Company"}
            </Pill>
            {publisher.isVerified ? (
              <span
                className="text-[rgb(var(--color-accent))]"
                title="Verified publisher"
                aria-label="Verified"
              >
                <BadgeCheck size={20} aria-hidden />
              </span>
            ) : null}
          </div>
          {publisher.description ? (
            <p className="text-[rgb(var(--color-fg-muted))] mb-3 max-w-2xl">{publisher.description}</p>
          ) : null}
          <SocialLinks publisher={publisher} />
          <p className="mt-3 text-xs text-[rgb(var(--color-fg-subtle))]">{postCount} posts</p>
        </div>
      </div>
      {followAction ? <div className="shrink-0">{followAction}</div> : null}
    </header>
  );
}
