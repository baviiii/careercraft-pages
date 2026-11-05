/**
 * "Learn it" — for each skill in the pathway: videos to watch, what people who
 * do the work say, and courses or guides that teach it. One skill at a time:
 * the first loads straight away, the others when picked, so searches (and
 * YouTube's small free allowance) are only spent on what someone opens.
 *
 * Sources are always shown. YouTube's titles and thumbnails appear as they
 * come, labelled as YouTube, and videos play in YouTube's own player (the
 * privacy-enhanced youtube-nocookie.com one) only once clicked; every web
 * result shows its site and links to it. The coach's "why" sits beside a
 * title, never replacing it.
 */
import { useEffect, useState } from "react";
import { BookOpen, Dumbbell, ExternalLink, Loader2, MessagesSquare, PlayCircle, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { careerCoach, type SkillVideos, type SkillWeb, type StudyVideo, type WebPick } from "@/lib/careerCoach";
import { ResourceProgress } from "@/features/interview/components/ResourceProgress";

function views(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

function length(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

function VideoCard({ video, onPractise }: { video: StudyVideo; onPractise: (skill: string) => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="rounded-lg bg-muted/40 p-3 space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        {playing ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative h-full w-full"
            aria-label={`Play ${video.title}`}
          >
            <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
              <PlayCircle className="h-12 w-12 text-white drop-shadow" />
            </span>
          </button>
        )}
      </div>
      <p className="text-sm font-medium leading-snug">{video.title}</p>
      <p className="text-xs text-muted-foreground">
        {video.channelTitle} · {views(video.views)} · {length(video.durationSeconds)}
        {video.publishedAt ? ` · ${video.publishedAt.slice(0, 4)}` : ""}
      </p>
      {video.why && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Why watch:</span> {video.why}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <ResourceProgress
          resource={{ url: video.url, title: video.title, provider: `YouTube · ${video.channelTitle}`, skill: video.skill }}
        />
        <Button size="sm" variant="outline" onClick={() => onPractise(video.skill)}>
          <Dumbbell className="w-3.5 h-3.5 mr-1.5" />
          Practise it
        </Button>
      </div>
    </div>
  );
}

function WebList({ picks, skill, why }: { picks: WebPick[]; skill: string; why: string }) {
  return (
    <div className="space-y-2">
      {picks.map((p) => (
        <div key={p.url} className="rounded-lg bg-muted/40 p-3">
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline inline-flex items-start gap-1"
          >
            {p.title}
            <ExternalLink className="w-3 h-3 shrink-0 mt-1" />
          </a>
          <p className="text-xs text-muted-foreground">
            {p.site}
            {p.publishedDate ? ` · ${p.publishedDate.slice(0, 4)}` : ""}
          </p>
          {p.why && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground/80">{why}</span> {p.why}
            </p>
          )}
          <div className="mt-2">
            <ResourceProgress resource={{ url: p.url, title: p.title, provider: p.site, skill }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type Loaded<T> = T | "error";

/** Loads one result per job + skill and keeps it, so a rebuilt pathway reuses what's already loaded. */
function useSkillResults<T>(active: string | undefined, field: string | undefined, load: (skill: string) => Promise<T>) {
  const [results, setResults] = useState<Record<string, Loaded<T>>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const key = active ? `${field ?? ""}|${active}` : null;

  useEffect(() => {
    if (!active || !key) return;
    if (results[key] && results[key] !== "error") return;
    let cancelled = false;
    setLoading(key);
    load(active)
      .then((r) => !cancelled && setResults((prev) => ({ ...prev, [key]: r })))
      .catch(() => !cancelled && setResults((prev) => ({ ...prev, [key]: "error" })))
      .finally(() => !cancelled && setLoading((l) => (l === key ? null : l)));
    return () => {
      cancelled = true;
    };
  }, [active, field]); // eslint-disable-line react-hooks/exhaustive-deps

  return { current: key ? results[key] : undefined, loading: key !== null && loading === key };
}

export function StudySkillLearning({
  skills,
  field,
  onPractise,
}: {
  skills: string[];
  field?: string;
  onPractise: (skill: string) => void;
}) {
  const [active, setActive] = useState(skills[0]);

  // A new pathway brings new skills: start from its first unless the open one is still in it.
  useEffect(() => {
    setActive((a) => (a && skills.includes(a) ? a : skills[0]));
  }, [skills.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const videos = useSkillResults<SkillVideos>(active, field, (skill) => careerCoach.skillVideos({ skill, field }));
  const web = useSkillResults<SkillWeb>(active, field, (skill) => careerCoach.skillWebResources({ skill, field }));

  if (!skills.length) return null;
  const v = videos.current;
  const w = web.current;

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Learn it — {active}</p>
        {skills.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <button key={s} type="button" onClick={() => setActive(s)}>
                <Badge variant={s === active ? "default" : "outline"} className="cursor-pointer text-[10px]">
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watch */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Youtube className="w-3.5 h-3.5" />
          Watch — videos from YouTube
        </p>
        {videos.loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Finding videos worth your time…
          </p>
        ) : v === "error" ? (
          <p className="text-xs text-muted-foreground">Couldn't load videos just now — try again in a moment.</p>
        ) : v && v.videos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No video good enough right now{v._meta?.reason ? ` (${v._meta.reason})` : ""}.
          </p>
        ) : v ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {v.videos.map((x) => (
                <VideoCard key={x.videoId} video={x} onPractise={onPractise} />
              ))}
            </div>
            {v.pickedBy === "ranked" && (
              <p className="text-[11px] text-muted-foreground">Picked by views and length — the coach couldn't review these.</p>
            )}
          </>
        ) : null}
      </section>

      {/* What people say + Courses & guides */}
      {web.loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching discussions, courses and guides…
        </p>
      ) : w === "error" ? (
        <p className="text-xs text-muted-foreground">Couldn't search the web just now — try again in a moment.</p>
      ) : w && !w.discussions.length && !w.guides.length ? (
        <p className="text-xs text-muted-foreground">
          No discussions or guides good enough right now{w._meta?.reason ? ` (${w._meta.reason})` : ""}.
        </p>
      ) : w ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessagesSquare className="w-3.5 h-3.5" />
              What people say
            </p>
            {w.discussions.length ? (
              <WebList picks={w.discussions} skill={w.skill} why="Why read:" />
            ) : (
              <p className="text-xs text-muted-foreground">No discussion good enough for this one.</p>
            )}
          </section>
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Courses &amp; guides
            </p>
            {w.guides.length ? (
              <WebList picks={w.guides} skill={w.skill} why="What you'll learn:" />
            ) : (
              <p className="text-xs text-muted-foreground">No course or guide good enough for this one.</p>
            )}
          </section>
          {w.pickedBy === "ranked" && (
            <p className="text-[11px] text-muted-foreground md:col-span-2">In the search engine's order — the coach couldn't review these.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
