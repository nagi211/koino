import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@koino/core";
import { Avatar } from "./avatar";
import { resolvePhotoSettings } from "./profile/photo-panel-content";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

export function ProfileCard({ profile }: { profile: Profile }) {
  // Mirrors the actual info panel: only show a cover bar here if the owner picked
  // the "cover" layout for their info panel — otherwise this card would show a
  // banner nothing on the real profile page has, which looked out of place.
  const { layout, coverImageUrl } = resolvePhotoSettings(profile.photo_settings);
  const hasCover = layout === "cover";

  return (
    <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
      {hasCover && (
        <div className="relative h-16 overflow-hidden bg-gradient-to-r from-olive to-olive-dark">
          {coverImageUrl && <Image src={coverImageUrl} alt="" fill className="object-cover" />}
        </div>
      )}
      <div className="flex flex-col items-center px-4 pb-4 text-center">
        <div className={`rounded-full border-4 border-card ${hasCover ? "-mt-8" : "mt-4"}`}>
          <Avatar url={profile.avatar_url} username={profile.username} size={64} />
        </div>
        <p className="mt-2 text-xs text-muted">{getGreeting()}</p>
        <p className="text-sm font-semibold text-foreground">{profile.display_name || `@${profile.username}`}</p>
        <p className="text-xs text-muted">{profile.bio || (profile.status === "pending" ? "New here — say hello!" : "Member of Koino")}</p>
        <Link
          href="/profile"
          className="mt-3 w-full rounded-xl border border-card-border py-2 text-sm text-foreground transition hover:bg-input"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}
