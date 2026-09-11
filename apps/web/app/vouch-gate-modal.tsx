"use client";

import { Modal } from "./modal";
import { VouchRequestPanel } from "./profile/vouch-request-panel";

/** Shown when a logged-in guest (status='pending') attempts something that
 * requires being vouched active — embeds the real request flow directly so
 * they can act right there instead of being sent off to find it themselves. */
export function VouchGateModal({ open, onClose, guestId }: { open: boolean; onClose: () => void; guestId: string }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-2 text-lg font-semibold text-foreground">Let&apos;s get to know you first</h2>
      <p className="mb-4 text-sm text-muted">
        Posting and reacting are for people who are part of the community. Say hello below to request to talk with a leader.
      </p>
      <VouchRequestPanel guestId={guestId} />
    </Modal>
  );
}
