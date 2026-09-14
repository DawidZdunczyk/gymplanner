<!-- PLAN-REVIEW-REPORT -->

# Przegląd planu S-01

Data: 2026-09-14. Werdykt: **SOUND**. Tryb głęboki, jedna niezależna analiza czterech ryzykownych kontraktów.

| Wymiar       | Wynik | Uzasadnienie                                                                             |
| ------------ | ----- | ---------------------------------------------------------------------------------------- |
| Stan końcowy | PASS  | Role, statusy HTTP, puste stany i odwołanie dostępu mają jednoznaczny kontrakt.          |
| Zakres       | PASS  | Dwie tabele i trzy widoki; treningi i publikacja pozostają poza zmianą.                  |
| Architektura | PASS  | Jeden klient SSR na żądanie, niecykliczne RLS, złożone FK z NOT NULL.                    |
| Ślepe punkty | PASS  | Plan obejmuje refresh, błędy Auth, wszystkie operacje zapisu i brak migracji w kopii CI. |
| Kompletność  | PASS  | Trzy fazy i 14 kryteriów mają zgodne odpowiedniki w Progress.                            |

Sprawdzono istniejące pliki `src/lib/supabase.ts`, `src/middleware.ts`, trzy endpointy Auth, `scripts/local-smoke.mjs`, `scripts/prepare-ci-supabase.mjs`, `scripts/smoke.mjs`, Layout oraz CI. Symbole `createClient`, `getUser`, `setAll`, `prepareCiSupabase` istnieją; wszystkie wywołania tworzenia klienta są objęte planem.

Biblioteka SSR przechowuje zmienione cookies i przekazuje nagłówki cache w drugim argumencie `setAll`. Auth `__loadSession` sprawdza metadane `expires_at` i wywołuje rzeczywisty refresh; test nie musi zmieniać JWT. Obecne CI kopiuje tylko konfigurację, więc kopiowanie migracji jest wymagane.

Uwagi wykonawcze: generowanie typów również respektuje `SUPABASE_WORKDIR`; odczyty relacji muszą rozróżnić dwa FK do profili (można zastosować osobne jawne zapytania). Nie wymagają nowych decyzji produktu. Wykonalność migracji i RLS pozostaje do potwierdzenia rzeczywistymi testami fazy 1.
