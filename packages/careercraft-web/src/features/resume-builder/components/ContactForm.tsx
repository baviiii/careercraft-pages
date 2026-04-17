import type { ContactInfo } from "../types";
import { CraftInput, CraftSection, LabelledField } from "./FormField";

interface ContactFormProps {
  contact: ContactInfo;
  onChange: (field: keyof ContactInfo, value: string) => void;
}

export const ContactForm = ({ contact, onChange }: ContactFormProps) => (
  <CraftSection
    kicker="§ Contact"
    title={
      <>
        The <span className="cc-italic-wonk">masthead</span>.
      </>
    }
    sub="Where the reader finds you — name, wire, post."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      <LabelledField label="Full name" required>
        <CraftInput
          value={contact.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Jane Doe"
        />
      </LabelledField>
      <LabelledField label="Email" required>
        <CraftInput
          type="email"
          value={contact.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="jane@example.com"
        />
      </LabelledField>
      <LabelledField label="Phone">
        <CraftInput
          value={contact.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
      </LabelledField>
      <LabelledField label="Location">
        <CraftInput
          value={contact.location}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="San Francisco, CA"
        />
      </LabelledField>
      <LabelledField label="LinkedIn">
        <CraftInput
          value={contact.linkedin || ""}
          onChange={(e) => onChange("linkedin", e.target.value)}
          placeholder="linkedin.com/in/janedoe"
        />
      </LabelledField>
      <LabelledField label="Website">
        <CraftInput
          value={contact.website || ""}
          onChange={(e) => onChange("website", e.target.value)}
          placeholder="janedoe.com"
        />
      </LabelledField>
    </div>
  </CraftSection>
);
