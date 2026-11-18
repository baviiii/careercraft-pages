/* Turning an uploaded file's name into something fit to show or save as a
   title. A browser upload keeps the file's own name, which can be as raw as
   "Jo_Bloggs_-_Data_Analyst__Cloud_%26_Ops.pdf" — this reads it as
   "Jo Bloggs - Data Analyst Cloud & Ops". A name someone typed instead (it
   has a space) keeps its own characters, "C++ Developer" included, so a
   typed name is never mistaken for an encoded one. */

const FILE_EXT = /\.(pdf|docx?|odt|rtf|txt|pages)$/i;

export function tidyFileName(raw: string): string {
  let name = raw.trim().replace(FILE_EXT, "");
  if (!/\s/.test(name)) {
    try {
      name = decodeURIComponent(name);
    } catch {
      /* a stray "%" that isn't an escape: keep it as written */
    }
    name = name.replace(/_+/g, " ");
  }
  return name.replace(/\s+/g, " ").trim();
}
