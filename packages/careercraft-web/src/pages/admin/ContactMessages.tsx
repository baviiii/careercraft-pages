/* Messages sent from Contact. Admins only; the table's policy is what
   actually keeps everyone else out. */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type Kind = "question" | "bug" | "idea";

interface Message {
  id: string;
  email: string;
  kind: Kind;
  message: string;
  created_at: string;
}

const KIND_LABEL: Record<Kind, string> = {
  question: "Question",
  bug: "Bug",
  idea: "Idea",
};

export default function ContactMessages() {
  const [rows, setRows] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: loadError } = await supabase
        .from("contact_messages")
        .select("id, email, kind, message, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      if (loadError) {
        setError(loadError.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as Message[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Questions, bugs, and ideas from Contact.</p>

      {rows === null ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-8 text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {KIND_LABEL[row.kind] ?? row.kind}
                  <span className="ml-2 font-normal text-muted-foreground">{row.email}</span>
                </p>
                <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
