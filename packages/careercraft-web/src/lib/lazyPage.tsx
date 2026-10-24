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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<Module<T>>) {
  let loaded: Module<T> | null = null;
  let pending: Promise<Module<T>> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (m) => (loaded = m),
      (e) => {
        pending = null; // let a later navigation try again
        throw e;
      },
    ));
  const Lazy = lazy(preload);

  function Page(props: ComponentProps<T>) {
    const [Ready] = useState(() => loaded?.default ?? null);
    return Ready ? <Ready {...props} /> : <Lazy {...props} />;
  }
  return Object.assign(Page, { preload });
}
