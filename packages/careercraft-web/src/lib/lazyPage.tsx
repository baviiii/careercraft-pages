import { lazy, useState, type ComponentProps, type ComponentType } from "react";

type Module<T> = { default: T };

/**
 * React.lazy plus a `preload()`, for pages that arrive as prerendered HTML.
 *
 * main.tsx preloads the page being opened before it starts React. If the
 * module is already here when the page mounts, it's rendered directly, so the
 * first render is the page itself; with plain lazy() it always suspended once,
 * and the Suspense spinner briefly replaced the prerendered text.
 *
 * Which one to render is decided once per mount: switching from the lazy
 * wrapper to the real component while on screen would remount the page and
 * throw away its state.
 *
 * A failed load (offline, or a deploy removed the file) gets a fresh
 * React.lazy for the next mount: lazy() keeps its first rejection forever,
 * so reusing it would fail every later visit until a reload.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<Module<T>>) {
  let loaded: Module<T> | null = null;
  let pending: Promise<Module<T>> | null = null;
  let Lazy = lazy(() => preload());
  function preload(): Promise<Module<T>> {
    return (pending ??= load().then(
      (m) => (loaded = m),
      (e) => {
        pending = null;
        Lazy = lazy(() => preload());
        throw e;
      },
    ));
  }

  function Page(props: ComponentProps<T>) {
    const [Ready] = useState(() => loaded?.default ?? null);
    const [Fallback] = useState(() => Lazy);
    return Ready ? <Ready {...props} /> : <Fallback {...props} />;
  }
  return Object.assign(Page, { preload });
}
