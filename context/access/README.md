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

## Weryfikacja S-01

- `npm run smoke:local` sprawdza istniejący przepływ Auth w obu trybach lokalnych. Konto bez profilu poprawnie widzi „Konto oczekuje na konfigurację”; ten test nie dowodzi uprawnień trenera.
- `npm run smoke:access:local` sprawdza RLS oraz panele obu ról, kartę, puste stany, rzeczywistą rotację refresh tokena, odwołanie dostępu i nagłówki cache. Runner sam buduje i uruchamia tymczasowy preview, po czym go zatrzymuje. Port 4321 musi być wolny.
- `node --test scripts/access-runner.test.mjs` oraz `node --experimental-strip-types --test scripts/access-context.test.mjs` sprawdzają zabezpieczenia runnera i rozróżnienie awarii od stanów pustych.
- `npm run check:access:ci` wykonuje oba smoke kolejno na świeżym, izolowanym projekcie lokalnym, kopiując konfigurację i wyłącznie migracje SQL. Zatrzymuje tylko swój projekt. W CI te same kroki są jawnie zapisane w workflow.

Nowe widoki są pod `/dashboard` i `/dashboard/trainees/<UUID>`. Nie ma funkcji treningowych. Brak przypisania podopiecznego jest poprawnym stanem; awaria Auth lub danych daje 503 z komunikatem o niedostępności. Polityka dostępu nie korzysta z edytowalnych metadanych Auth.

Końcowa kontrola ręczna z planu: trener rozróżnia dwie osoby o tej samej nazwie i otwiera kartę; podopieczny rozpoznaje swojego trenera; brak profilu i relacji dają właściwe komunikaty. Sprawdzić telefon, klawiaturę, wylogowanie oraz lokalną zmianę przypisania i awarię backendu. Automatyczne testy HTTP nie zastępują potwierdzenia tej kontroli przez użytkownika.
