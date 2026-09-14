# Reguły testów E2E

- Przeczytaj `context/foundation/test-plan.md`; test odpowiada na konkretne ryzyko użytkownika.
- Wzoruj nowe scenariusze na `seed.spec.ts`.
- Używaj getByRole, getByLabel i getByText, bez CSS/XPath i zależności od układu DOM.
- Każdy test ma niezależne, losowe fixture oraz cleanup. Dane wyłącznie lokalne.
- Sesje obu ról przekazuj przez storageState. Uwierzytelnianie przygotowuje fixture, nie powtarzane klikanie logowania.
- Nie używaj waitForTimeout; czekaj na konkretny stan lub odpowiedź.
- Sprawdzaj wynik biznesowy i trwałość po reload, nie sam tytuł strony.
- Auth, aplikacja i baza są prawdziwe. Celowy błąd użyty do sprawdzenia asercji musi zostać cofnięty; nigdy nie commituj osłabionej logiki.
- Hasła, klucze, cookies i storageState nie trafiają do repo ani raportów. Trace wyłączony dla tych scenariuszy.
