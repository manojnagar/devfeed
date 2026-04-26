/**
 * @file Admin: add a new publisher.
 */

import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertPublisherAction } from "../../actions";

export default function NewPublisherPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Add publisher</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          Manually add a publisher. To add a new feed source, use the Sources tab.
        </p>
      </header>
      <Card>
        <CardBody>
          <form action={upsertPublisherAction} className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue="company">
                <option value="company">Company</option>
                <option value="person">Person</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required minLength={2} />
            </div>
            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" name="websiteUrl" type="url" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="twitterHandle">Twitter handle</Label>
                <Input id="twitterHandle" name="twitterHandle" placeholder="stripe" />
              </div>
              <div>
                <Label htmlFor="githubHandle">GitHub handle</Label>
                <Input id="githubHandle" name="githubHandle" placeholder="stripe" />
              </div>
            </div>
            <div>
              <Label htmlFor="defaultAccessLabel">Default access label</Label>
              <Select id="defaultAccessLabel" name="defaultAccessLabel" defaultValue="free">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="members_only">Members only</option>
                <option value="mixed">Mixed</option>
              </Select>
            </div>
            <Button type="submit" variant="primary">Create</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
