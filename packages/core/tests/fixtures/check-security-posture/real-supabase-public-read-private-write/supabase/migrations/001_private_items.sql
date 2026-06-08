alter table public.private_items enable row level security;

create policy select_all_policy on public.private_items
for select
using (true);

create policy insert_auth_policy on public.private_items
for insert
with check (auth.uid() is not null);

create policy update_own_policy on public.private_items
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy delete_own_policy on public.private_items
for delete
using (auth.uid() = owner_id);
