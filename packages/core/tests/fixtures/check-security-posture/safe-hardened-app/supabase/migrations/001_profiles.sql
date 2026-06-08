alter table profiles enable row level security;

create policy "users manage their own profile"
on profiles
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
