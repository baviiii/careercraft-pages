import { useState } from "react";

import { badgeFor, faviconUrl, hostOf } from "../lib/brand";

/** A lettered badge in the name's own colour. */
export const NameBadge = ({ name, size = 40 }: { name: string; size?: number }) => {
  const b = badgeFor(name);
  return (
    <span
      aria-hidden
      className="fc-badge cc-font-display"
      style={{ width: size, height: size, background: b.bg, color: b.fg, fontSize: size * 0.36 }}
    >
      {b.letters}
    </span>
  );
};

/**
 * The publisher's favicon on a white tile, falling back to a lettered badge
 * when there isn't one. Google answers unknown domains with a 16px globe, so
 * anything smaller than asked for counts as missing too.
 */
export const SourceLogo = ({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) => {
  const host = hostOf(url);
  const [failed, setFailed] = useState(false);

  if (!host || failed) return <NameBadge name={name} size={size} />;

  return (
    <span aria-hidden className="fc-logo" style={{ width: size, height: size }}>
      <img
        src={faviconUrl(host)}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth < 32) setFailed(true);
        }}
        onError={() => setFailed(true)}
      />
    </span>
  );
};
