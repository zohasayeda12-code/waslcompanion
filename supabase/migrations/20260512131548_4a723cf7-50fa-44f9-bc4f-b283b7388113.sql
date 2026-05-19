
-- Explicit deny-all policies. All app access happens server-side via the
-- service-role client scoped by user_id. Clients (anon/authenticated) cannot
-- see or modify these rows directly.
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','journey_state','intentions','reflections_local',
    'bookmarks_local','collections_local','collection_items_local',
    'highlights','recently_revisited','push_subscriptions','notification_log'
  ]) loop
    execute format('create policy "deny_all_select" on public.%I for select using (false);', t);
    execute format('create policy "deny_all_insert" on public.%I for insert with check (false);', t);
    execute format('create policy "deny_all_update" on public.%I for update using (false) with check (false);', t);
    execute format('create policy "deny_all_delete" on public.%I for delete using (false);', t);
  end loop;
end $$;
