/**
 * "Learn it" — for each skill in the open plan: videos to watch, what people
 * who do the work say, and courses or guides that teach it. One skill at a
 * time: the first loads straight away, the others when picked, so searches
 * (and YouTube's small free allowance) are only spent on what someone opens.
 *
 * Sources are always shown. YouTube's titles and thumbnails appear as they
 * come, labelled as YouTube, and videos play in YouTube's own player (the
 * privacy-enhanced youtube-nocookie.com one) only once clicked; every web
 * result shows its site and links to it. The coach's "why" sits beside a
 * title, never replacing it. Renders inside .cc-study.
 */
import { useEffect, useState } from "react";
import { ArrowUpRight, Loader2, Play } from "lucide-react";
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

/**
 * The year something was published, or nothing. Search providers don't all
 * send a date ("07:30", "unknown"), so only a real, sensible date shows.
 */
function publishedYear(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  const year = new Date(t).getFullYear();
  return year >= 1995 && year <= new Date().getFullYear() + 1 ? String(year) : null;
}

function VideoCard({ video, onPractise }: { video: StudyVideo; onPractise: (skill: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const year = publishedYear(video.publishedAt);
  return (
    <div className="st-video">
      <div className="st-video__frame">
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
          <button type="button" onClick={() => setPlaying(true)} className="h-full w-full" aria-label={`Play ${video.title}`}>
            <img src={video.thumbnail} alt="" loading="lazy" />
            <span className="st-video__play">
              <Play className="h-3.5 w-3.5" aria-hidden />
              {length(video.durationSeconds)}
            </span>
          </button>
        )}
      </div>
      <p className="st-link__site">
        YouTube · {video.channelTitle} · {views(video.views)}
        {year ? ` · ${year}` : ""}
      </p>
      <p className="st-video__title">{video.title}</p>
      {video.why && <p className="st-small">{video.why}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <ResourceProgress
          resource={{ url: video.url, title: video.title, provider: `YouTube · ${video.channelTitle}`, skill: video.skill }}
        />
        <button type="button" onClick={() => onPractise(video.skill)} className="cc-action cc-action--ghost cc-action--sm">
          Practise it
        </button>
      </div>
    </div>
  );
}

function WebList({ picks, skill }: { picks: WebPick[]; skill: string }) {
  return (
    <div className="st-links">
      {picks.map((p) => {
        const year = publishedYear(p.publishedDate);
        return (
          <div key={p.url} className="st-link">
            <div className="min-w-0">
              <p className="st-link__site">
                {p.site}
                {year ? ` · ${year}` : ""}
              </p>
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.title}
              </a>
              {p.why && <p className="st-small mt-1">{p.why}</p>}
              <div className="mt-2">
                <ResourceProgress resource={{ url: p.url, title: p.title, provider: p.site, skill }} />
              </div>
            </div>
            <ArrowUpRight className="mt-1 h-4 w-4 text-[color:var(--cc-ash)]" aria-hidden />
          </div>
        );
      })}
    </div>
  );
}

type Loaded<T> = T | "error";

/** Loads one result per job + skill and keeps it, so a rebuilt plan reuses what's already loaded. */
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

function Waiting({ children }: { children: string }) {
  return (
    <p className="st-small flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {children}
    </p>
  );
}

export function StudySkillLearning({
  skills,
  field,
  focus,
  onPractise,
}: {
  skills: string[];
  field?: string;
  /** A skill asked for from a plan session; a new n switches to it. */
  focus?: { skill: string; n: number } | null;
  onPractise: (skill: string) => void;
}) {
  const [active, setActive] = useState(focus?.skill ?? skills[0]);

  useEffect(() => {
    if (focus?.skill) setActive(focus.skill);
  }, [focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new plan brings new skills: start from its first unless the open one is still in it.
  useEffect(() => {
    setActive((a) => (a && skills.includes(a) ? a : skills[0]));
  }, [skills.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const videos = useSkillResults<SkillVideos>(active, field, (skill) => careerCoach.skillVideos({ skill, field }));
  const web = useSkillResults<SkillWeb>(active, field, (skill) => careerCoach.skillWebResources({ skill, field }));

  if (!skills.length) return null;
  const v = videos.current;
  const w = web.current;

  return (
    <div className="space-y-8 pt-4">
      {skills.length > 1 && (
        <div className="st-skilltabs" role="group" aria-label="Skill">
          {skills.map((s) => (
            <button key={s} type="button" aria-pressed={s === active} onClick={() => setActive(s)} className="st-chip">
              {s}
            </button>
          ))}
        </div>
      )}

      <section aria-label="Watch">
        <p className="st-label st-tone-wheat">Watch</p>
        <div className="mt-3">
          {videos.loading ? (
            <Waiting>Finding videos worth your time…</Waiting>
          ) : v === "error" ? (
            <p className="st-small">Couldn't load videos just now. Try again in a moment.</p>
          ) : v && v.videos.length === 0 ? (
            <p className="st-small">No video good enough right now{v._meta?.reason ? ` (${v._meta.reason})` : ""}.</p>
          ) : v ? (
            <>
              <div className="st-media">
                {v.videos.map((x) => (
                  <VideoCard key={x.videoId} video={x} onPractise={onPractise} />
                ))}
              </div>
              {v.pickedBy === "ranked" && (
                <p className="st-small mt-3">Picked by views and length: the coach couldn't review these.</p>
              )}
            </>
          ) : null}
        </div>
      </section>

      {web.loading ? (
        <Waiting>Searching discussions, courses and guides…</Waiting>
      ) : w === "error" ? (
        <p className="st-small">Couldn't search the web just now. Try again in a moment.</p>
      ) : w && !w.discussions.length && !w.guides.length ? (
        <p className="st-small">No discussions or guides good enough right now{w._meta?.reason ? ` (${w._meta.reason})` : ""}.</p>
      ) : w ? (
        <div className="grid gap-8 md:grid-cols-2">
          <section aria-label="What people say">
            <p className="st-label st-tone-cobalt">What people say</p>
            <div className="mt-2">
              {w.discussions.length ? (
                <WebList picks={w.discussions} skill={w.skill} />
              ) : (
                <p className="st-small mt-2">No discussion good enough for this one.</p>
              )}
            </div>
          </section>
          <section aria-label="Courses and guides">
            <p className="st-label st-tone-sage">Courses &amp; guides</p>
            <div className="mt-2">
              {w.guides.length ? (
                <WebList picks={w.guides} skill={w.skill} />
              ) : (
                <p className="st-small mt-2">No course or guide good enough for this one.</p>
              )}
            </div>
          </section>
          {w.pickedBy === "ranked" && (
            <p className="st-small md:col-span-2">In the search engine's order: the coach couldn't review these.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
