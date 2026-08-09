create table public.app_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('buyer', 'seller', 'repairer', 'delivery_agent')),
  context_type text not null,
  context_id uuid,
  quick_rating smallint check (quick_rating between 1 and 3),
  feedback_text text,
  created_at timestamptz not null default now()
);

create index idx_app_feedback_user on public.app_feedback(user_id);
create index idx_app_feedback_context on public.app_feedback(context_type, context_id);

alter table public.app_feedback enable row level security;

create policy "Users see only their own real feedback"
  on public.app_feedback for select
  using (auth.uid() = user_id);

create policy "Any signed-in user can submit real feedback"
  on public.app_feedback for insert
  with check (auth.uid() = user_id);

create policy "Admin can view all real feedback"
  on public.app_feedback for select
  using (public.get_user_role(auth.uid()) = 'admin');

comment on column public.app_feedback.quick_rating is '1=frustrated, 2=okay, 3=happy — the real, one-tap first ask';
comment on column public.app_feedback.context_type is 'e.g. order_delivered, repair_completed, delivery_completed — identifies which real completion moment triggered this';
