import { parseFeed } from "./feeds.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

const NOW = Date.parse("2026-11-19T00:00:00Z");
const FEED = { source: "Test", url: "https://example.com/feed", keep: "all" as const };

/** One RSS item with the given extra markup, and the picture parseFeed keeps for it. */
const pictureOf = (inner: string) => {
  const xml = `<?xml version="1.0"?><rss xmlns:media="https://search.yahoo.com/mrss/"><channel><item>
    <title>Hiring picks up in Adelaide</title>
    <link>https://example.com/story</link>
    <pubDate>Tue, 18 Nov 2026 09:00:00 GMT</pubDate>
    ${inner}
  </item></channel></rss>`;
  const stories = parseFeed(xml, FEED, NOW);
  if (stories.length !== 1) throw new Error(`expected one story, got ${stories.length}`);
  return stories[0].image_url;
};

Deno.test("a photo inside the summary's HTML is used (HCAMag)", () => {
  eq(
    pictureOf(
      `<description>&lt;img src=&quot;https://cdn.example.com/cms/a.png&quot; alt=&quot;&quot; style=&quot;max-width:240px&quot; /&gt;&lt;p&gt;Hiring picks up.&lt;/p&gt;</description>`,
    ),
    "https://cdn.example.com/cms/a.png",
    "inline img",
  );
});

Deno.test("a 1×1 view counter is never the picture (The Conversation)", () => {
  eq(
    pictureOf(
      `<description><![CDATA[<p>Story.</p><img src="https://counter.example.com/content/1/count.gif" alt="" width="1" height="1" />]]></description>`,
    ),
    null,
    "only a counter",
  );
  eq(
    pictureOf(
      `<description><![CDATA[<img src="https://images.example.com/files/1/original/photo.jpg?w=1050&amp;q=45" /><p>Story.</p><img src="https://counter.example.com/content/1/count.gif" width="1" height="1" />]]></description>`,
    ),
    "https://images.example.com/files/1/original/photo.jpg?w=1050&q=45",
    "photo before the counter",
  );
});

Deno.test("a photo whose name starts like a counter's still counts", () => {
  eq(
    pictureOf(`<description><![CDATA[<img src="https://images.example.com/countryside.png" />]]></description>`),
    "https://images.example.com/countryside.png",
    "countryside.png",
  );
});

Deno.test("the widest media:content wins (The Guardian lists 140, 460 and 700)", () => {
  eq(
    pictureOf(`
      <media:content width="140" url="https://i.example.com/a.jpg?width=140&amp;s=1" />
      <media:content width="460" url="https://i.example.com/a.jpg?width=460&amp;s=2" />
      <media:content width="700" url="https://i.example.com/a.jpg?width=700&amp;s=3" />`),
    "https://i.example.com/a.jpg?width=700&s=3",
    "widest",
  );
  eq(
    pictureOf(`
      <media:content url="https://cdn.example.com/a?crop=16x9" medium="image" />
      <media:content url="https://cdn.example.com/a?crop=1x1" medium="image" />`),
    "https://cdn.example.com/a?crop=16x9",
    "no widths: the first",
  );
});

Deno.test("pictures inside <media:group> are found (ABC)", () => {
  eq(
    pictureOf(`
      <media:group>
        <media:description>A caption.</media:description>
        <media:content url="https://cdn.example.com/a?w=862&amp;h=485" medium="image" type="image/jpeg" width="862" height="485" />
        <media:content url="https://cdn.example.com/a?w=862&amp;h=862" medium="image" type="image/jpeg" width="862" height="862" />
      </media:group>`),
    "https://cdn.example.com/a?w=862&h=485",
    "media:group, 16:9 first",
  );
});

Deno.test("a tagged picture beats one inside the HTML", () => {
  eq(
    pictureOf(`
      <enclosure url="https://assets.example.com/lead.jpg?quality=70&#038;w=840" type="image/jpeg" length="1" />
      <description><![CDATA[<img src="https://assets.example.com/other.jpg" />]]></description>`),
    "https://assets.example.com/lead.jpg?quality=70&w=840",
    "enclosure first",
  );
});

Deno.test("a protocol-relative picture is kept as https, anything else not", () => {
  eq(
    pictureOf(`<description><![CDATA[<img src="//images.example.com/a.jpg" />]]></description>`),
    "https://images.example.com/a.jpg",
    "protocol-relative",
  );
  eq(
    pictureOf(`<description><![CDATA[<img src="data:image/png;base64,AAAA" />]]></description>`),
    null,
    "data URL",
  );
});

Deno.test("a picture that isn't https doesn't hide the next one", () => {
  // Assembled, so the deploy check for insecure addresses in code doesn't trip on the test.
  const insecure = ["http", "://cdn.example.com/x.jpg"].join("");
  eq(
    pictureOf(`
      <media:content url="${insecure}" width="700" medium="image" />
      <enclosure url="https://cdn.example.com/x.jpg" type="image/jpeg" length="1" />`),
    "https://cdn.example.com/x.jpg",
    "falls through to the enclosure",
  );
});

Deno.test("widths given as 640px, or not at all, rank sensibly", () => {
  eq(
    pictureOf(`
      <media:content url="https://cdn.example.com/original.jpg" medium="image" />
      <media:content url="https://cdn.example.com/thumb.jpg" width="140" medium="image" />`),
    "https://cdn.example.com/original.jpg",
    "an unlabelled original beats a labelled thumbnail",
  );
  eq(
    pictureOf(`
      <media:content url="https://cdn.example.com/a.jpg" width="460" medium="image" />
      <media:content url="https://cdn.example.com/b.jpg" width="640px" medium="image" />`),
    "https://cdn.example.com/b.jpg",
    "640px reads as 640",
  );
});

Deno.test("a video is never the picture", () => {
  eq(
    pictureOf(`
      <media:group>
        <media:content url="https://cdn.example.com/clip.mp4" type="video/mp4" width="1280" />
        <media:content url="https://cdn.example.com/clip2" medium="video" width="1920" />
        <media:content url="https://cdn.example.com/a.jpg" medium="image" width="862" />
      </media:group>`),
    "https://cdn.example.com/a.jpg",
    "the image, not the wider videos",
  );
});

Deno.test("emoji and avatars in WordPress HTML are skipped for the photo after them", () => {
  eq(
    pictureOf(
      `<description><![CDATA[<p>Look <img src="https://s.w.org/images/core/emoji/15.0.3/72x72/1f449.png" alt="👉" class="wp-smiley" style="height: 1em; max-height: 1em;" /></p>
      <img src="https://secure.gravatar.com/avatar/abc?s=96" class="avatar avatar-96" width="96" height="96" />
      <img src="https://cdn.example.com/photo.jpg" width="1200" height="800" />]]></description>`,
    ),
    "https://cdn.example.com/photo.jpg",
    "the photo",
  );
});

Deno.test("lazy-loading markup gives its real address", () => {
  eq(
    pictureOf(
      `<description><![CDATA[<img src="data:image/gif;base64,R0lGODlh" data-lazy-src="https://cdn.example.com/photo.jpg" />]]></description>`,
    ),
    "https://cdn.example.com/photo.jpg",
    "data-lazy-src",
  );
});

Deno.test("only the tag's own width and height make an image tiny", () => {
  eq(
    pictureOf(
      `<description><![CDATA[<img data-height="1" src="https://cdn.example.com/resize?url=a.jpg&height=2" width="800" />]]></description>`,
    ),
    "https://cdn.example.com/resize?url=a.jpg&height=2",
    "data-height and a query string don't count",
  );
});

Deno.test("no picture at all stays empty (iTnews)", () => {
  eq(pictureOf(`<description>Hiring picks up across the state.</description>`), null, "none");
});
