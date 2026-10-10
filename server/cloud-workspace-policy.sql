-- Apply once to an existing ConvertShorts backend. Keep RLS enabled and retain
-- member access, while allowing an owner to read their INSERT ... RETURNING row.
alter policy cs_workspace_read on public.convertshorts_workspaces
using (owner_id=(select auth.uid()) or convertshorts_private.can_access(id));
