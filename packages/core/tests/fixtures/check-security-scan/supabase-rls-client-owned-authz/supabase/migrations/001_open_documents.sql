alter table documents disable row level security;

create policy "everyone can edit"
on documents
for all
using (true)
with check (true);
