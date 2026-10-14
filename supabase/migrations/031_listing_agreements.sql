begin;

create function public.guard_listing_agreement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (new.listing_type is distinct from old.listing_type or new.price_label is distinct from old.price_label
    or new.meetup_note is distinct from old.meetup_note) and exists (
      select 1 from public.requests where item_id = old.id and status in ('approved', 'handed_over')
    ) then
    raise exception 'Rental terms and meetup details cannot change during an approved or ongoing loan.';
  end if;
  return new;
end;
$$;
comment on function public.guard_listing_agreement() is
  'Row-locked listing edits preserve rental type/label and meetup details for approved or handed-over loans; other listing content remains editable.';
revoke execute on function public.guard_listing_agreement() from public, anon, authenticated;
create trigger listing_agreement_guard before update of listing_type, price_label, meetup_note on public.items
for each row execute function public.guard_listing_agreement();

commit;
