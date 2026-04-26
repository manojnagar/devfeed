/**
 * @file Digest preferences — frequency, hour, content filters.
 */

import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateDigestPreferencesAction } from "../actions";

export const dynamic = "force-dynamic";

const ACCESS_LABELS: Array<{ value: "free" | "paid" | "members_only" | "mixed"; label: string }> = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "members_only", label: "Members only" },
  { value: "mixed", label: "Mixed" },
];

export default async function DigestPreferencesPage() {
  const session = await requireUser();
  const prefs = await getRepository().digest.getPreferences(session.user.userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Digest preferences</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          Choose how often we email you and which content to include.
        </p>
      </header>

      <Card>
        <CardBody>
          <form action={updateDigestPreferencesAction} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select id="frequency" name="frequency" defaultValue={prefs.frequency}>
                  <option value="off">Off (don&apos;t send)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly (Mondays)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferredHourUtc">Preferred hour (UTC)</Label>
                <Select
                  id="preferredHourUtc"
                  name="preferredHourUtc"
                  defaultValue={String(prefs.preferredHourUtc)}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}:00 UTC
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <CardTitle className="text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))] mb-2">
                Sources
              </CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="includeFollowedPublishers"
                  defaultChecked={prefs.includeFollowedPublishers}
                  className="accent-[rgb(var(--color-accent))]"
                />
                Include posts from publishers I follow
              </label>
              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  name="includeFollowedTags"
                  defaultChecked={prefs.includeFollowedTags}
                  className="accent-[rgb(var(--color-accent))]"
                />
                Include posts matching tags I follow
              </label>
            </div>

            <div>
              <CardTitle className="text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))] mb-2">
                Access labels
              </CardTitle>
              <div className="flex flex-wrap gap-3">
                {ACCESS_LABELS.map((l) => (
                  <label key={l.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="includeAccessLabels"
                      value={l.value}
                      defaultChecked={prefs.includeAccessLabels.includes(l.value)}
                      className="accent-[rgb(var(--color-accent))]"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPostsPerEmail">Max posts per email</Label>
                <Select
                  id="maxPostsPerEmail"
                  name="maxPostsPerEmail"
                  defaultValue={String(prefs.maxPostsPerEmail)}
                >
                  {[5, 8, 10, 12, 15, 20, 25, 30].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button type="submit" variant="primary">Save preferences</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
