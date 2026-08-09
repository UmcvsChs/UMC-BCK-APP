-- Real product Q&A — matching the exact kitchen-utensils-carton example
-- described: a photo of a sealed carton often can't convey count, color
-- options, or size variants. A real buyer question, answered by the
-- real seller, visible to everyone browsing that product afterward, so
-- the same clarification helps every future buyer too.
create table public.product_questions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references auth.users(id),
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_product_questions_product on public.product_questions(product_id);

alter table public.product_questions enable row level security;

create policy "Anyone signed in can view product questions"
  on public.product_questions for select
  using (auth.uid() is not null);

create policy "Any signed-in buyer can ask a real question"
  on public.product_questions for insert
  with check (auth.uid() = buyer_id);

create policy "Only the real seller who owns this product can answer"
  on public.product_questions for update
  using (
    exists (
      select 1 from public.products p
      join public.sellers s on s.id = p.seller_id
      where p.id = product_questions.product_id and s.user_id = auth.uid()
    )
  );