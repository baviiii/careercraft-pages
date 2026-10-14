/* Fields the job pop-up can jump straight to ("Set a follow-up", "Pick one",
   "Add a note"). The form puts these ids on the matching inputs. */
export type JobFormFocus = "reminder" | "resume" | "notes" | "ad";

export const fieldId = (f: JobFormFocus) => `job-form-${f}`;
