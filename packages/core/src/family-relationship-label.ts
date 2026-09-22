import type { FamilyRelationship, Profile } from "./types";

export const FAMILY_RELATIONSHIP_OPTIONS: { value: FamilyRelationship; label: string }[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "sister", label: "Sister" },
  { value: "brother", label: "Brother" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "cousin", label: "Cousin" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
];

export const FAMILY_RELATIONSHIP_LABEL: Record<FamilyRelationship, string> = Object.fromEntries(
  FAMILY_RELATIONSHIP_OPTIONS.map((opt) => [opt.value, opt.label])
) as Record<FamilyRelationship, string>;

/**
 * Display-only inversion for when the viewer is the *addressee* of a
 * family_connections row — `relationship` always reads "addressee is
 * requester's {relationship}" (however sendFamilyRequest was called), so this
 * derives what the requester is *to the addressee* instead. Gendered terms
 * fall back to a neutral word when the requester's gender isn't set.
 */
export function inverseFamilyRelationshipLabel(relationship: FamilyRelationship, requester: Pick<Profile, "gender">): string {
  const gender = requester.gender;
  switch (relationship) {
    case "mother":
    case "father":
      return "Child";
    case "grandmother":
    case "grandfather":
      return "Grandchild";
    case "aunt":
    case "uncle":
      return gender === "male" ? "Nephew" : gender === "female" ? "Niece" : "Niece/Nephew";
    case "child":
      return gender === "male" ? "Father" : gender === "female" ? "Mother" : "Parent";
    case "sister":
    case "brother":
      return gender === "male" ? "Brother" : gender === "female" ? "Sister" : "Sibling";
    case "cousin":
      return "Cousin";
    case "spouse":
      return "Spouse";
    case "other":
      return "Other";
  }
}

/** The relationship label to show a specific viewer for a family_connections row — correctly directed regardless of which side of the edge they're on. */
export function familyRelationshipLabelFor(
  relationship: FamilyRelationship,
  viewerIsRequester: boolean,
  requesterProfile: Pick<Profile, "gender">
): string {
  return viewerIsRequester ? FAMILY_RELATIONSHIP_LABEL[relationship] : inverseFamilyRelationshipLabel(relationship, requesterProfile);
}
