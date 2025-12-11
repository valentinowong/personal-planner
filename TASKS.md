Here’s what’s missing today and concrete improvements to preload assignee info so the UI never flickers or shows
  “Assigned”/“Unassigned” placeholders.

  Problems observed

  - get_tasks_window returns only assignee_id; no display/email, so the Task Detail must wait for list-member data.
  - Members are loaded per-list (useListMembers(listId)) and only after opening the detail, so there’s a race on first open.
  - The owner’s display name comes from auth metadata or a late profile fetch; collaborators’ display names rely on the
    profiles join inside fetchListShares, so non-shared assignees (e.g., reassigned by someone else) still lack names.
  - We don’t prefetch a global “assignee directory” for the current window of tasks.

  Improvements (minimal backend + frontend)

  1. Enrich the tasks window RPC:
      - Add a join to profiles (and optionally auth.users email) in get_tasks_window, returning assignee_display_name and
        assignee_email.
      - Extend TaskWindowRow to include these fields and store them in the local cache (sanitizeTaskPayload / toWindowRow).
      - This gives every task row its own assignee label without extra requests.
  2. Prefetch assignee profiles for the visible window:
      - Add a hook useAssigneeProfiles(start, end) that:
          - Reads assignee_ids from the tasks query result.
          - Fires a single profiles select with in (ids) (deduped) and caches by user_id.
      - Use this map to render labels anywhere tasks are shown (cards, detail, backlog) as a fast fallback to RPC enrichment.
  3. Broaden member fetching:
      - Change useListMembers to accept an array of list ids (e.g., active lists in the window) and return a merged member
        map. This preloads potential assignees once instead of per modal open.
      - Keep the per-list role info, but expose a lookup by user_id so components can read names immediately.
  4. Denormalize for offline/UI speed (optional but effective):
      - Store assignee_display_name in the local tasks table (and sync it from the RPC). Update it optimistically on
        assignment changes.
      - On assignment changes, also update a small assignee_profiles cache keyed by user_id.
  5. Guardrails / RLS:
      - Ensure the profiles RLS allows select when user_id = auth.uid() OR the user shares a list with auth.uid(). Otherwise
        the join in get_tasks_window will return nulls for shared collaborators.

  Suggested implementation order

  1. RPC change + TaskWindowRow shape and cache plumbing.
  2. useAssigneeProfiles hook and consume it in Task Detail + cards as fallback.
  3. Expand useListMembers to multi-list prefetch and switch consumers to the shared map.
  4. (Optional) denormalize display name into tasks for offline / zero-join rendering.

  This will give you assignee names at the same time as tasks load, eliminate the modal flicker, and reduce redundant
  queries. Let me know which steps you want me to implement now—I can start with the RPC enrichment and frontend wiring.