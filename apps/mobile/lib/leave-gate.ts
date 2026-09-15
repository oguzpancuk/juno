/**
 * When the settings sheet may let a sign-out or a deletion leave the
 * screen. Kept apart from the profile so its rules can be tested without a
 * renderer.
 *
 * The navigation — and the sign-out that sets every screen redirecting —
 * must not run while the sheet is presented or still fading out: on iOS a
 * navigation issued during a modal's dismissal is dropped (NOTES
 * 2026-09-15). So a leave asked for while the sheet is up is queued and run
 * when the sheet reports itself gone. But a deletion can finish after the
 * person has already closed the sheet, and then nothing will report it
 * gone again: a leave asked for while the sheet is down runs at once
 * (review, 2026-09-15 — it used to wait for ever, signed in to a deleted
 * account). And only the first leave counts: "Çıkış yap" during a
 * deletion, then the deletion finishing, must not sign out twice — a late
 * second sign-out would wipe a session signed in since.
 */
export class LeaveGate {
  /** From the tap that opens the sheet until it reports itself gone. */
  private sheetUp = false;
  private left = false;
  private mounted = true;
  private queued: (() => void) | null = null;

  opened(): void {
    this.sheetUp = true;
  }

  /** The sheet is fully off the screen; run what was waiting for that. */
  dismissed(): void {
    this.sheetUp = false;
    const next = this.queued;
    this.queued = null;
    if (this.mounted) next?.();
  }

  /**
   * Leave: now, after `close` has taken the sheet away, or not at all.
   * The answer is for the caller's state and for the tests.
   */
  leave(next: () => void, close: () => void): 'ran' | 'queued' | 'ignored' {
    if (this.left || !this.mounted) return 'ignored';
    this.left = true;
    if (!this.sheetUp) {
      next();
      return 'ran';
    }
    this.queued = next;
    close();
    return 'queued';
  }

  /**
   * The host is on screen. Also called again after `unmounted` when a
   * development build re-runs effects, so the gate is not left shut.
   */
  attached(): void {
    this.mounted = true;
  }

  /** The host is gone; a deletion finishing later must not act. */
  unmounted(): void {
    this.mounted = false;
    this.queued = null;
  }
}
