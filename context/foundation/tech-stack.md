---
starter_id: 10x-astro-starter
package_manager: npm
project_name: gym-planner
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
---

## Why this stack

Użytkownik wybrał standardową rekomendację `10x-astro-starter`: Astro, React, TypeScript, Tailwind CSS oraz Supabase (PostgreSQL i uwierzytelnianie). Stos odpowiada małej, responsywnej aplikacji webowej GymPlanner z logowaniem, trwałym zapisem wyników i relacjami trener–podopieczny. Schemat danych treningowych, zachowanie rozpisek rozpoczętych treningów oraz reguły dostępu, w tym RLS i prywatne komentarze, wymagają implementacji. Przyjęto domyślny dla standardowej rekomendacji profil jednoosobowy; nie ustalono budżetu czasu. Użytkownik zatwierdził Cloudflare Workers zgodnie z [aktualną konfiguracją startera](https://github.com/przeprogramowani/10x-astro-starter/blob/master/wrangler.jsonc), świadomie zastępując nieaktualny cel `cloudflare-pages` z lokalnego rejestru; bootstrapper ma użyć konfiguracji Workers. GitHub Actions ma sprawdzać kod i docelowo automatycznie wdrażać po scaleniu do `main`; uruchomienie wdrożeń wymaga osobnego etapu konfiguracji infrastruktury. Podsumowanie AI (FR-011) pozostaje opcjonalnym rozszerzeniem poza wymaganym MVP: flaga AI oznacza planowaną późniejszą integrację, której starter nie zawiera. Płatności, realtime i zadania w tle nie są wymagane. Starter spełnia cztery kryteria jakości według rejestru; poziom `first-class` oznacza obsługiwane tworzenie szkieletu, które może wymagać ręcznych poprawek.
