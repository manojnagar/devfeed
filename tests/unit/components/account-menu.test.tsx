/**
 * @file Tests for the AccountMenu component.
 *
 * Verifies the menu opens, surfaces every /me/* destination, exposes a
 * sign-out button posting to the signOutAction, and closes on Escape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccountMenu } from "@/components/layout/account-menu";

vi.mock("@/app/(public)/login/actions", () => ({
  signOutAction: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function open(): HTMLElement {
  const trigger = screen.getByRole("button", { name: /open account menu/i });
  fireEvent.click(trigger);
  return screen.getByRole("menu", { name: /account/i });
}

describe("<AccountMenu />", () => {
  it("renders a closed menu by default with the avatar visible", () => {
    render(<AccountMenu displayName="Demo Reader" email="demo@devfeed.local" isAdmin={false} />);
    const trigger = screen.getByRole("button", { name: /open account menu/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens on click and lists every /me/* destination plus sign-out", () => {
    render(<AccountMenu displayName="Demo Reader" email="demo@devfeed.local" isAdmin={false} />);
    const menu = open();
    expect(menu).toBeInTheDocument();

    expect(screen.getByText("Demo Reader")).toBeInTheDocument();
    expect(screen.getByText("demo@devfeed.local")).toBeInTheDocument();

    expect(screen.getByRole("menuitem", { name: /digest preferences/i })).toHaveAttribute(
      "href",
      "/me/digest",
    );
    expect(screen.getByRole("menuitem", { name: /^bookmarks$/i })).toHaveAttribute(
      "href",
      "/me/bookmarks",
    );
    expect(screen.getByRole("menuitem", { name: /followed publishers/i })).toHaveAttribute(
      "href",
      "/me/followed-publishers",
    );
    expect(screen.getByRole("menuitem", { name: /followed tags/i })).toHaveAttribute(
      "href",
      "/me/followed-tags",
    );
    expect(screen.getByRole("menuitem", { name: /my suggestions/i })).toHaveAttribute(
      "href",
      "/me/suggestions",
    );
    expect(screen.getByRole("menuitem", { name: /account settings/i })).toHaveAttribute(
      "href",
      "/me/account",
    );

    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("hides the admin-console link for non-admins", () => {
    render(<AccountMenu displayName="User" email="u@d.local" isAdmin={false} />);
    open();
    expect(screen.queryByRole("menuitem", { name: /admin console/i })).toBeNull();
  });

  it("shows the admin-console link for admins", () => {
    render(<AccountMenu displayName="Boss" email="b@d.local" isAdmin />);
    open();
    expect(screen.getByRole("menuitem", { name: /admin console/i })).toHaveAttribute(
      "href",
      "/admin/overview",
    );
  });

  it("closes on Escape", () => {
    render(<AccountMenu displayName="Demo Reader" email="demo@devfeed.local" isAdmin={false} />);
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("the sign-out submit posts a form (Server Action)", () => {
    render(<AccountMenu displayName="Demo" email="d@d.local" isAdmin={false} />);
    open();
    const signOut = screen.getByRole("menuitem", { name: /sign out/i });
    expect(signOut.closest("form")).not.toBeNull();
  });
});
