/**
 * "Watch" — YouTube videos for learning the pathway's skills, one skill at a
 * time: the first loads straight away, the others when picked, so YouTube's
 * small free allowance is only spent on what someone opens.
 *
 * YouTube's rules shape this card: its titles and thumbnails are shown as
 * they come, labelled as YouTube, and videos play in YouTube's own player
 * (the privacy-enhanced youtube-nocookie.com one), only once clicked. The
 * coach's "why" sits beside the title, never replacing it.
 */
import { useEffect, useState } from "react";
import { Dumbbell, Loader2, PlayCircle, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { careerCoach, type SkillVideos, type StudyVideo } from "@/lib/careerCoach";
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

export function StudyVideos({
  skills,
  field,
  onPractise,
}: {
  skills: string[];
  field?: string;
  onPractise: (skill: string) => void;
}) {
  const [active, setActive] = useState(skills[0]);
  // Keyed by job and skill, so a rebuilt pathway reuses what's already loaded.
  const [results, setResults] = useState<Record<string, SkillVideos | "error">>({});
  const [loading, setLoading] = useState<string | null>(null);
  const keyFor = (skill: string) => `${field ?? ""}|${skill}`;

  // A new pathway brings new skills: start from its first unless the open one is still in it.
  useEffect(() => {
    setActive((a) => (a && skills.includes(a) ? a : skills[0]));
  }, [skills.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    const key = keyFor(active);
    if (results[key] && results[key] !== "error") return;
    let cancelled = false;
    setLoading(key);
    careerCoach
      .skillVideos({ skill: active, field })
      .then((r) => !cancelled && setResults((prev) => ({ ...prev, [key]: r })))
      .catch(() => !cancelled && setResults((prev) => ({ ...prev, [key]: "error" })))
      .finally(() => !cancelled && setLoading((l) => (l === key ? null : l)));
    return () => {
      cancelled = true;
    };
  }, [active, field]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!skills.length) return null;
  const current = active ? results[keyFor(active)] : undefined;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Youtube className="w-3.5 h-3.5" />
          Watch — videos from YouTube
        </p>
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

      {active && loading === keyFor(active) ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Finding videos worth your time for {active}…
        </p>
      ) : current === "error" ? (
        <p className="text-xs text-muted-foreground">Couldn't load videos just now — try again in a moment.</p>
      ) : current && current.videos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No video good enough for {active} right now{current._meta?.reason ? ` (${current._meta.reason})` : ""}.
        </p>
      ) : current ? (
        <div className="grid gap-3 md:grid-cols-2">
          {current.videos.map((v) => (
            <VideoCard key={v.videoId} video={v} onPractise={onPractise} />
          ))}
        </div>
      ) : null}
      {current && current !== "error" && current.pickedBy === "ranked" && current.videos.length > 0 && (
        <p className="text-[11px] text-muted-foreground">Picked by views and length — the coach couldn't review these.</p>
      )}
    </div>
  );
}
