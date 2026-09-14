# Przygotowanie dostępu

Konta Auth przygotowuje operator. Publiczna rejestracja pozostaje wyłączona. Każde konto ma jedną rolę; podopieczny najwyżej jednego trenera. Nazwy mogą się powtarzać, opisy muszą być unikalne (bez rozróżniania wielkości liter i skrajnych spacji).

Na lokalnym Supabase zastosuj `npx supabase db push --local`. Nie używaj resetu. Dla izolowanego projektu dodaj `--workdir "$SUPABASE_WORKDIR"` do polecenia Supabase. Typy generuj z tego samego lokalnego projektu przez `supabase gen types --local --schema public`.

[Szablon SQL](../../supabase/admin/provision-access.sql) przyjmuje zmienne psql dla istniejących UUID Auth, nazw i opisów. Uruchamiaj go uprzywilejowanym połączeniem lokalnym, z poświadczeniami przekazanymi przez środowisko. Transakcja tworzy oba nowe profile oraz relację; istniejący profil lub opis powoduje błąd, a nie nadpisanie. Dla istniejącego trenera dodaj osobno nowy profil podopiecznego i przypisanie w jednej transakcji.

Jawna zmiana przypisania (zmienne psql; oba profile muszą już istnieć):

```sql
begin;
update public.trainer_assignments
set trainer_id = :'new_trainer_id'::uuid
where trainee_id = :'trainee_id'::uuid and trainer_id = :'old_trainer_id'::uuid;
-- Operator sprawdza UPDATE 1 przed COMMIT; UPDATE 0 wymaga wyjaśnienia i ROLLBACK.
commit;
```

Odwołanie dostępu:

```sql
begin;
delete from public.trainer_assignments
where trainee_id = :'trainee_id'::uuid and trainer_id = :'old_trainer_id'::uuid;
-- Operator sprawdza DELETE 1 przed COMMIT.
commit;
```

Stary trener traci dostęp przy następnym odczycie, również z istniejącą sesją. Już otwarta strona nie jest zdalnie czyszczona. RLS ogranicza odczyt także przez bezpośrednie API; użytkownicy aplikacji nie mogą zapisywać profili ani relacji.

`npm run check:access:db` sprawdza prawdziwe lokalne sesje, izolację danych i ograniczenia bazy. Wymaga Node 22.22.3, Dockera oraz uruchomionego lokalnego Supabase. Tworzy losowe konta wyłącznie lokalnie, po czym usuwa tylko swoje fixture. Nie wypisuje kluczy ani haseł. Kolidujące pliki środowiska powodują odmowę przed zapisem.

Ta zmiana nie publikuje migracji na hostowanych bazach. Przed udostępnieniem potrzebny jest osobno zatwierdzony plan migracji staging i produkcji, przygotowania kont oraz publikacji aplikacji.
