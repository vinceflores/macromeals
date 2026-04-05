/**
 * presentation/app/routes/friends.tsx
 */

import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fetch } from "~/lib/auth.server";
import { getSession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Link } from "react-router";
import type { Route } from "./+types/friends";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";

type UserResult = {
  id: number;
  email: string;
  full_name: string;
  friend_status: FriendStatus;
  request_id: number | null;
};

type FriendRequest = {
  id: number;
  sender: { id: number; email: string; full_name: string };
  receiver: { id: number; email: string; full_name: string };
  status: string;
  created_at: string;
};

type LoaderData = {
  friends: UserResult[];
  pendingRequests: FriendRequest[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const [friendsRes, requestsRes] = await Promise.all([
    Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/friends/`), session),
    Fetch(new Request(`${process.env.SERVER_URL}/api/accounts/friends/requests/`), session),
  ]);

  const friends         = await friendsRes.json();
  const pendingRequests = await requestsRes.json();

  return data<LoaderData>({ friends, pendingRequests });
}

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.data.access) return redirect("/auth/login");

  const form   = await request.formData();
  const intent = String(form.get("intent") ?? "");

  // ── Search users ──────────────────────────────────────────────────────────
  if (intent === "search_users") {
    const q = String(form.get("q") ?? "").trim();
    try {
      const res = await Fetch(
        new Request(
          `${process.env.SERVER_URL}/api/accounts/users/search/?q=${encodeURIComponent(q)}`,
        ),
        session,
      );
      const results = await res.json();
      return data({ intent: "search_results", results: Array.isArray(results) ? results : [] });
    } catch {
      return data({ intent: "search_results", results: [] });
    }
  }

  // ── Send friend request ───────────────────────────────────────────────────
  if (intent === "send_request") {
    const receiverId = form.get("receiver_id");
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/friends/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: Number(receiverId) }),
      }),
      session,
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return data({ success: false, message: body?.detail ?? "Failed to send request." });
    }
    return data({ success: true, message: "Friend request sent!" });
  }

  // ── Accept request ────────────────────────────────────────────────────────
  if (intent === "accept_request") {
    const requestId = form.get("request_id");
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/friends/request/${requestId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      session,
    );
    if (!res.ok) return data({ success: false, message: "Failed to accept request." });
    return data({ success: true, message: "Friend request accepted!" });
  }

  // ── Reject request ────────────────────────────────────────────────────────
  if (intent === "reject_request") {
    const requestId = form.get("request_id");
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/friends/request/${requestId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      }),
      session,
    );
    if (!res.ok) return data({ success: false, message: "Failed to reject request." });
    return data({ success: true, message: "Request rejected." });
  }

  // ── Remove friend ─────────────────────────────────────────────────────────
  if (intent === "remove_friend") {
    const requestId = form.get("request_id");
    const res = await Fetch(
      new Request(`${process.env.SERVER_URL}/api/accounts/friends/${requestId}/`, {
        method: "DELETE",
      }),
      session,
    );
    if (!res.ok && res.status !== 204)
      return data({ success: false, message: "Failed to remove friend." });
    return data({ success: true, message: "Friend removed." });
  }

  return data({ success: false, message: "Unknown action." });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const { friends, pendingRequests } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  type Tab = "find" | "friends" | "requests";
  const activeTab: Tab = (searchParams.get("tab") as Tab) ?? "find";

  function setTab(tab: Tab) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  const pendingCount = pendingRequests.length;

  return (
    <div className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Friends</h1>
        <p className="text-muted-foreground mt-1">
          Find people, manage requests, and view friends' recipes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(
          [
            { key: "find",     label: "Find People" },
            { key: "friends",  label: "My Friends" },
            { key: "requests", label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "find"     && <FindPeopleTab />}
      {activeTab === "friends"  && <MyFriendsTab friends={friends} />}
      {activeTab === "requests" && <RequestsTab requests={pendingRequests} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Find People tab — search goes through the route action
// ─────────────────────────────────────────────────────────────────────────────

function FindPeopleTab() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<UserResult[]>([]);

  // One fetcher for search, one for friend actions (add etc.)
  const searchFetcher = useFetcher();
  const actionFetcher = useFetcher();

  // When search results come back, store them in state
  useEffect(() => {
    if (searchFetcher.data?.intent === "search_results") {
      setResults(searchFetcher.data.results ?? []);
    }
  }, [searchFetcher.data]);

  // Toast for friend request actions
  useEffect(() => {
    if (!actionFetcher.data || actionFetcher.data.intent === "search_results") return;
    if (actionFetcher.data.success) toast.success(actionFetcher.data.message);
    else toast.error(actionFetcher.data.message);
  }, [actionFetcher.data]);

  const isSearching = searchFetcher.state !== "idle";

  return (
    <div className="space-y-4">
      {/* Search form — uses searchFetcher so it doesn't wipe results on friend add */}
      <searchFetcher.Form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="search_users" />
        <Input
          name="q"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </searchFetcher.Form>

      {results.length === 0 && !isSearching && (
        <p className="text-sm text-muted-foreground">
          Search for MacroMeals users to add as friends.
        </p>
      )}

      <ul className="space-y-2">
        {results.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            <actionFetcher.Form method="post">
              {user.friend_status === "none" && (
                <>
                  <input type="hidden" name="intent"      value="send_request" />
                  <input type="hidden" name="receiver_id" value={user.id} />
                  <Button type="submit" size="sm">Add Friend</Button>
                </>
              )}
              {user.friend_status === "pending_sent" && (
                <span className="text-xs text-muted-foreground px-3 py-1 border rounded-full">
                  Request sent
                </span>
              )}
              {user.friend_status === "pending_received" && (
                <span className="text-xs text-muted-foreground px-3 py-1 border rounded-full">
                  Wants to add you
                </span>
              )}
              {user.friend_status === "accepted" && (
                <span className="text-xs text-green-600 px-3 py-1 border border-green-300 rounded-full bg-green-50">
                  Friends ✓
                </span>
              )}
            </actionFetcher.Form>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Friends tab
// ─────────────────────────────────────────────────────────────────────────────

function MyFriendsTab({ friends }: { friends: UserResult[] }) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) toast.success(fetcher.data.message);
    else toast.error(fetcher.data.message);
  }, [fetcher.data]);

  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No friends yet. Find people in the Find People tab!
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {friends.map((friend) => (
        <li
          key={friend.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="font-medium">{friend.full_name}</p>
            <p className="text-xs text-muted-foreground">{friend.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/friends/${friend.id}/recipes`}>View Recipes</Link>
            </Button>

            <fetcher.Form method="post">
              <input type="hidden" name="intent"     value="remove_friend" />
              <input type="hidden" name="request_id" value={friend.request_id ?? ""} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </Button>
            </fetcher.Form>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests tab
// ─────────────────────────────────────────────────────────────────────────────

function RequestsTab({ requests }: { requests: FriendRequest[] }) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) toast.success(fetcher.data.message);
    else toast.error(fetcher.data.message);
  }, [fetcher.data]);

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending friend requests.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {requests.map((req) => (
        <li
          key={req.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="font-medium">{req.sender.full_name}</p>
            <p className="text-xs text-muted-foreground">{req.sender.email}</p>
          </div>

          <div className="flex gap-2">
            <fetcher.Form method="post">
              <input type="hidden" name="intent"     value="accept_request" />
              <input type="hidden" name="request_id" value={req.id} />
              <Button type="submit" size="sm">Accept</Button>
            </fetcher.Form>

            <fetcher.Form method="post">
              <input type="hidden" name="intent"     value="reject_request" />
              <input type="hidden" name="request_id" value={req.id} />
              <Button type="submit" size="sm" variant="outline">Decline</Button>
            </fetcher.Form>
          </div>
        </li>
      ))}
    </ul>
  );
}
