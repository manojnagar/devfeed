/**
 * @file Admin: add a new publisher.
 */

import { upsertPublisherAction } from "../../actions";
import { PublisherForm } from "../_components/publisher-form";

export default function NewPublisherPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Add publisher</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          Manually add a publisher. To add a new feed source, use the Sources tab.
        </p>
      </header>
      <PublisherForm action={upsertPublisherAction} />
    </div>
  );
}
