add Accept / Reject for share invites:

  1) Data & API

  - Reuse existing table/columns (list_shares.status = pending/active/revoked).
  - Use current API functions:
      - acceptShare(shareId) (already exists).
      - Add declineShare(shareId) that sets status='revoked' (or delete row).
  - Ensure RLS allows the invitee (user_id) to update their own pending invites (policy already added; verify).

  2) Surface pending invites in UI

  - Add a “Invites” tab/section to the Notifications modal (or a card at top):
      - Fetch pending shares where status='pending' and user_id=auth.uid() (or email match if user_id null).
      - Show list name, inviter (invited_by), timestamp, action buttons: Accept / Decline.
  - Alternatively (or in addition), add an “Invites” block in List Settings → Sharing for pending invites assigned to
    the current user.

  3) Actions

  - Accept: call acceptShare(shareId); invalidate list-shares and notifications; toast “Added to list”.
  - Decline: call declineShare(shareId); same invalidations; toast “Invite declined”.
  - Disable buttons while mutating; show inline spinner per row.

  4) Notifications behavior

  - When Accept: DB trigger already sends share_accepted to owner; also mark the invite notification read client-side.
  - When Decline: fire share_revoked (reuse revoke trigger) so owner knows; mark invite notification read.
  - Optional: auto-delete the invite notification on accept/decline.

  5) Visibility rules

  - Only show invites where:
      - status='pending', and (user_id = auth.uid() OR invited_email = currentUserEmail).
      - Hide Inbox/system lists as unshareable (but they shouldn’t be invitables anyway).
  - If invite lacks user_id but email matches current user, allow accept (call acceptShare, which sets user_id).

  6) Error handling

  - On 403/404, show “Invite no longer valid.”
  - If accept fails due to RLS, prompt to refresh.

  7) Small UX polish

  - In Notifications tab: badge “Invites” when pending > 0.
  - Empty state: “No invites—ask to be added to a list.”

  If you’re good with this, I’ll implement the decline API, add the pending-invites list to the Notifications modal with
  Accept/Decline buttons, and wire the mutations + cache invalidation.