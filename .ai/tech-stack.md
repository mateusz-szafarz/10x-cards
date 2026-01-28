Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testing - Kompleksowe pokrycie testami na wszystkich warstwach:
- Vitest 4 do testów jednostkowych i integracyjnych - natywna integracja z Vite (używanym przez Astro), ESM-first, kompatybilne API z Jest
- @testing-library/react do testowania komponentów React - standard branżowy, testuje zachowanie z perspektywy użytkownika
- MSW 2 do mockowania HTTP - interceptuje fetch na poziomie sieci dla realistycznych testów hooków i serwisów
- Playwright do testów E2E - stabilne API, trace viewer do debugowania, tylko Chromium dla szybkości
- jsdom jako lekkie środowisko DOM dla testów komponentów React w Vitest
- @vitest/coverage-v8 do raportowania pokrycia kodu z konfigurowalnymi progami (minimum 60%)

CI/CD i Hosting:
- Github Actions do tworzenia pipeline’ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
