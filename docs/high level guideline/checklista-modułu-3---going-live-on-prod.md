---
title: "Checklista Modułu 3 - Going LIVE on prod!"
module: "m3-prod"
description: "Kompleksowa checklista wdrożenia aplikacji na produkcję"
source: "Przeprogramowani.pl - 10xDevs"
exported: "2025-11-21"
---

# Checklista Modułu 3 - Produkcyjne Wdrożenie

Kompleksowa checklista najważniejszych kroków z lekcji modułu 3 (3x) kursu 10xDevs - Produkcyjne Wdrożenie. **Prawdziwie uniwersalna** - skupiona wyłącznie na **pracy z AI** przy wdrażaniu aplikacji na produkcję, całkowicie niezależna od stacku technologicznego.

---

## Spis treści

- [[3x1] Implementacja uwierzytelniania z AI](#3x1-implementacja-uwierzytelniania-z-ai)
  - [Krok 1: Aktualizacja User Stories w PRD](#krok-1-aktualizacja-user-stories-w-prd)
  - [Krok 2: Specyfikacja architektury autentykacji](#krok-2-specyfikacja-architektury-autentykacji)
  - [Krok 3: Generowanie diagramów Mermaid (opcjonalnie)](#krok-3-generowanie-diagramów-mermaid-opcjonalnie)
  - [Krok 4-6: Implementacja UI i backendu autentykacji](#krok-4-6-implementacja-ui-i-backendu-autentykacji)
  - [Krok 7: Zabezpieczenie routingu](#krok-7-zabezpieczenie-routingu)
- [[3x2] Planowanie strategii testowania z AI](#3x2-planowanie-strategii-testowania-z-ai)
  - [Krok 1: Utworzenie Test Planu](#krok-1-utworzenie-test-planu)
  - [Krok 2: Konfiguracja środowiska testowego](#krok-2-konfiguracja-środowiska-testowego)
  - [Krok 3: Wizualizacja struktury komponentów do testowania](#krok-3-wizualizacja-struktury-komponentów-do-testowania)
  - [Krok 4: Analiza kandydatów do testów jednostkowych](#krok-4-analiza-kandydatów-do-testów-jednostkowych)
  - [Krok 5: Implementacja testów jednostkowych](#krok-5-implementacja-testów-jednostkowych)
- [[3x3] Testy end-to-end user flows](#3x3-testy-end-to-end-user-flows)
  - [Krok 1: Konfiguracja środowiska testowego E2E](#krok-1-konfiguracja-środowiska-testowego-e2e)
  - [Krok 2: Dodanie testowego użytkownika](#krok-2-dodanie-testowego-użytkownika)
  - [Krok 3: Synchronizacja schematu bazy](#krok-3-synchronizacja-schematu-bazy)
  - [Krok 4: Konfiguracja frameworka E2E](#krok-4-konfiguracja-frameworka-e2e)
  - [Krok 5: Dodanie selektorów do UI](#krok-5-dodanie-selektorów-do-ui)
  - [Krok 6: Implementacja Page Object Models (POM)](#krok-6-implementacja-page-object-models-pom)
  - [Krok 7: Implementacja testów E2E](#krok-7-implementacja-testów-e2e)
  - [Krok 8: Konfiguracja teardown (czyszczenie danych)](#krok-8-konfiguracja-teardown-czyszczenie-danych)
- [[3x4] Refaktoryzacja i optymalizacja z AI](#3x4-refaktoryzacja-i-optymalizacja-z-ai)
  - [Krok 1: Analiza złożoności z "AI Detektywem"](#krok-1-analiza-złożoności-z-ai-detektywem)
  - [Krok 2: Refaktoryzacja formularzy (opcjonalnie)](#krok-2-refaktoryzacja-formularzy-opcjonalnie)
  - [Krok 3: Responsywność UI (opcjonalnie)](#krok-3-responsywność-ui-opcjonalnie)
  - [Krok 4: Migracja do nowszej wersji frameworka (opcjonalnie)](#krok-4-migracja-do-nowszej-wersji-frameworka-opcjonalnie)
  - [Krok 5: Implementacja zabezpieczeń na poziomie bazy](#krok-5-implementacja-zabezpieczeń-na-poziomie-bazy)
- [[3x5] Konfiguracja CI/CD z AI](#3x5-konfiguracja-cicd-z-ai)
  - [Krok 1: Poznanie konceptów CI/CD](#krok-1-poznanie-konceptów-cicd)
  - [Krok 2: Pierwszy scenariusz testowy (Hello World)](#krok-2-pierwszy-scenariusz-testowy-hello-world)
  - [Krok 3: Pull Request Pipeline (WYMAGANE DO CERTYFIKATU)](#krok-3-pull-request-pipeline-wymagane-do-certyfikatu)
  - [Krok 4: Konfiguracja sekretów środowiskowych](#krok-4-konfiguracja-sekretów-środowiskowych)
- [[3x6] Deployment na produkcję z AI](#3x6-deployment-na-produkcję-z-ai)
  - [Krok 1: Feature Flags (OPCJONALNIE)](#krok-1-feature-flags-opcjonalnie)
  - [Krok 2: Analiza platform hostingowych](#krok-2-analiza-platform-hostingowych)
  - [Ścieżka A: Deployment serverless](#ścieżka-a-deployment-serverless)
    - [Krok 3A: Konfiguracja projektu na platformie](#krok-3a-konfiguracja-projektu-na-platformie)
    - [Krok 4A: Konfiguracja frameworka dla serverless (jeśli wymagane)](#krok-4a-konfiguracja-frameworka-dla-serverless-jeśli-wymagane)
    - [Krok 5A: Konfiguracja zmiennych środowiskowych](#krok-5a-konfiguracja-zmiennych-środowiskowych)
    - [Krok 6A: Sprawdzenie kompatybilności dependencies](#krok-6a-sprawdzenie-kompatybilności-dependencies)
    - [Krok 7A: Master Branch Deployment Pipeline](#krok-7a-master-branch-deployment-pipeline)
    - [Krok 8A: Konfiguracja monitoring i logging](#krok-8a-konfiguracja-monitoring-i-logging)
  - [Ścieżka B: Deployment z kontenerami (Docker)](#ścieżka-b-deployment-z-kontenerami-docker)
    - [Krok 3B: Generowanie Dockerfile](#krok-3b-generowanie-dockerfile)
    - [Krok 4B: Testowanie lokalnie](#krok-4b-testowanie-lokalnie)
    - [Krok 5B: Publikacja obrazu na Container Registry](#krok-5b-publikacja-obrazu-na-container-registry)
    - [Krok 6B: Konfiguracja platformy dla kontenerów](#krok-6b-konfiguracja-platformy-dla-kontenerów)
    - [Krok 7B: Generowanie credentials dla automated deployment](#krok-7b-generowanie-credentials-dla-automated-deployment)
    - [Krok 8B: Master Branch Pipeline z Dockerem](#krok-8b-master-branch-pipeline-z-dockerem)

[Sekcje końcowe]
- [Podsumowanie i certyfikacja](#podsumowanie-i-certyfikacja)
- [Zasoby i narzędzia](#zasoby-i-narzędzia)
- [Zasady pracy](#zasady-pracy)
- [Najczęstsze pytania (FAQ)](#najczęstsze-pytania-faq)

---

### [3x1] Implementacja uwierzytelniania z AI

#### Krok 1: Aktualizacja User Stories w PRD
- **Opis**: Rozbuduj `.ai/prd.md` o user stories związane z autentykacją
- **Przykładowe User Stories**:
  - US-004: Bezpieczny dostęp (logowanie, rejestracja, wylogowanie)
  - Relacje z istniejącymi US (które funkcje wymagają logowania?)
- **Uwagi**:
  - Określ które strony są publiczne, a które wymagają logowania
  - Czy obsługujesz OAuth (Google, GitHub)?
  - Czy potrzebna jest funkcja "forgot password"?

#### Krok 2: Specyfikacja architektury autentykacji
- **Opis**: Przeprowadź sesję planistyczną z modelem reasoningowym
- **Narzędzie**: Model reasoningowy (Gemini 2.5 Pro, o1, DeepSeek-R1, Claude Sonnet)
- **Prompt**: [Specyfikacja Architektury Autentykacji](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=dab016a1-30c3-4312-a764-56e59f847354)
- **Prompt walidacyjny**: [Walidacja Specyfikacji Autentykacji](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=8e8dac09-a2c3-4801-8f20-243cdcadd2fb)
- **Lokalizacja**: `.ai/auth-spec.md`
- **Elementy specyfikacji**:
  - User flow (rejestracja, logowanie, wylogowanie, reset hasła)
  - Struktura komponentów UI
  - API endpoints / route handlers
  - Session management (strategia: cookies, JWT, server sessions)
  - Error handling i walidacja
  - Security measures (rate limiting, CSRF protection)
- **Rola AI**: Analiza wymagań z PRD i zaproponowanie architektury dopasowanej do stacku
- **Uwagi**: Cross-check wymagania PRD z wygenerowaną specyfikacją

#### Krok 3: Generowanie diagramów Mermaid (opcjonalnie)
- **Opis**: Wygeneruj diagramy przepływów autentykacji w formacie Mermaid
- **Prompt**: [Diagram Przepływu Autentykacji](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=95da7239-3fed-4511-907d-cf5b3c026105)
- **Typy diagramów**:
  - Sequence diagram: przepływ logowania
  - User journey: doświadczenie użytkownika
  - Component diagram: struktura UI/API
- **Uwagi**:
  - Mermaid to tekstowa reprezentacja diagramów
  - Łatwo wersjonować w Git
  - Wsparcie w GitHub, GitLab, Notion

#### Krok 4-6: Implementacja UI i backendu autentykacji
- **Opis**: Zaimplementuj komponenty autentykacji w iteracjach (vertical slice)
- **Strategia**: Najpierw pełny flow jednej funkcjonalności (np. logowanie), potem kolejne
- **Workflow dla każdej funkcjonalności** (logowanie, rejestracja, reset hasła):
  1. UI: formularz + walidacja + obsługa błędów
  2. Backend: endpoint/handler + integracja z auth provider/service
  3. Session management: zapisywanie i weryfikacja sesji
  4. Zabezpieczenia: rate limiting, CSRF, input sanitization
- **Prompty**:
  - [Implementacja UI Autentykacji](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=f26a2606-2eaa-4400-93d7-e1ff6d92d171)
  - [Planowanie Integracji Backendu Logowania](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=1b538016-8e16-44a2-8ab1-c8b9a8ea75a2)
  - [Implementacja Funkcjonalności Wylogowania](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=cb281a1b-295f-4f3b-8aea-3510669b3191)
  - [Implementacja Backendu Rejestracji](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=bbcf6060-3ab7-4010-8904-5c666de7845a)
- **Rola AI**: Generowanie kodu zgodnego z auth-spec.md i konwencjami stacku
- **Kluczowe decyzje** (poproś AI o analizę):
  - Własny system auth vs. Auth-as-a-Service (Auth0, Clerk, Supabase Auth, etc.)
  - Strategia sesji (stateless JWT vs stateful server sessions)
  - OAuth providers (Google, GitHub, etc.) - czy potrzebne?
  - Email confirmation workflow
- **Uwagi**:
  - Zadbaj o dostępność (a11y): labels, ARIA attributes, keyboard navigation
  - Testuj każdy flow manualnie przed przejściem dalej

#### Krok 7: Zabezpieczenie routingu
- **Opis**: Zaimplementuj mechanizm ochrony chronionych stron/route'ów
- **Prompt**: [Implementacja Ochrony Routingu](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l1-auth&prompt=ea627ec0-2f1c-444f-b2e2-66c14d1a7196)
- **Rola AI**: Pomoc w implementacji middleware/guards zgodnych ze stackiem
- **Strategia** (zapytaj AI o implementację):
  - Weryfikacja sesji przed renderowaniem strony
  - Przekierowanie na stronę logowania jeśli brak autoryzacji
  - Whitelist stron publicznych
  - Obsługa edge cases (expired session, invalid token)
- **Uwagi**:
  - W stackach SSR: middleware na serwerze
  - W stackach CSR: route guards w routerze
  - Zapytaj AI o best practices dla twojego stacku

---

### [3x2] Planowanie strategii testowania z AI

#### Krok 1: Utworzenie Test Planu
- **Opis**: Wygeneruj kompleksowy Test Plan definiujący strategię, scope i narzędzia testowania
- **Narzędzia (opcje)**:
  - [GitIngest](https://gitingest.com/) + [Google AI Studio](https://aistudio.google.com/) (Gemini 2.5 Pro) - FREE dla osobistych projektów
  - GitIngest + Claude Sonnet / o1 - płatne API
  - Agent z globalnym przeszukiwaniem codebase
- **Lokalizacja**: `.ai/test-plan.md`
- **Elementy Test Planu**:
  - Strategia testowania (piramida testów)
  - Scope (co testujemy, czego nie testujemy)
  - Narzędzia (framework testowy dla stacku)
  - Test cases (unit, integration, e2e)
  - Edge cases i scenariusze graniczne
- **Rola AI**: Analiza projektu i wygenerowanie kompleksowego planu testowania
- **UWAGA**: Google AI Studio udostępnia konwersacje w celach treningowych - dla projektów komercyjnych używaj płatnych API

#### Krok 2: Konfiguracja środowiska testowego
- **Opis**: Wybierz i skonfiguruj framework do testów jednostkowych
- **Rola AI**: Pomoc w wyborze i konfiguracji narzędzi dla twojego stacku
- **Kluczowe pytania** (zapytaj AI):
  - Jaki framework testowy jest rekomendowany dla mojego stacku?
  - Jak skonfigurować test runner (watch mode, coverage, reporters)?
  - Jakie dodatkowe biblioteki potrzebne (assertions, mocking, fixtures)?
- **Uwagi**:
  - Watch mode nie jest wygodny dla agentów AI (preferuj single run)
  - Skonfiguruj script w package.json/composer.json/requirements.txt
  - Zapytaj AI o przykładową konfigurację

#### Krok 3: Wizualizacja struktury komponentów do testowania
- **Opis**: Wygeneruj diagram struktury komponentów i ich zależności
- **Prompt**: [Wizualizacja Struktury Komponentów](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l2-unit-tests&prompt=59982e4c-9f0b-4362-b0b5-b75f53ecbc88)
- **Format**: Diagram ASCII/Mermaid pokazujący:
  - Moduły/komponenty aplikacji
  - Zależności między nimi
  - Warstwy architektury (UI, logika biznesowa, data access)
- **Rola AI**: Analiza codebase i wygenerowanie mapy struktury

#### Krok 4: Analiza kandydatów do testów jednostkowych
- **Opis**: Przeprowadź analizę który kod najlepiej pokryć testami unit
- **Prompt**: [Analiza Kandydatów do Testów Jednostkowych](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l2-unit-tests&prompt=1670ae8e-b0b8-4a99-a7e2-e8a858aa2d1f)
- **Priorytety testowania**:
  1. Logika biznesowa (serwisy, utils)
  2. Transformacje danych (parsery, formatery)
  3. Komponenty z logiką (nie prezentacyjne)
- **Rola AI**: Identyfikacja modułów o najwyższym ROI dla testów
- **Uwagi**: NIE testuj: prostych prezentacyjnych komponentów, third-party bibliotek

#### Krok 5: Implementacja testów jednostkowych
- **Opis**: Zaimplementuj testy dla wybranych modułów
- **Prompt**: [Implementacja Testów Jednostkowych](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l2-unit-tests&prompt=97661e33-554f-42b1-ba32-864577095519)
- **Rola AI**: Generowanie testów zgodnych z Test Planem i konwencjami stacku
- **Struktura testów** (universal pattern):
  - Pliki testowe obok kodu źródłowego (co-location) lub w dedykowanym folderze
  - Naming convention: zapytaj AI o konwencję dla stacku
  - Pattern: Arrange → Act → Assert (AAA)
  - Mockowanie zależności zewnętrznych (API, baza danych, filesystem)
- **Kluczowe zasady**:
  - Jeden test = jedna asercja (lub logicznie spójny zestaw)
  - Testy izolowane (nie zależą od siebie)
  - Szybkie wykonanie (unikaj I/O, użyj mocków)
- **Uwagi**:
  - Commituj testy razem z kodem
  - Dodawaj testy na bieżąco, nie na końcu projektu
  - Aktualizuj testy przy refaktoryzacji

---

### [3x3] Testy end-to-end user flows

#### Krok 1: Konfiguracja środowiska testowego E2E
- **Opis**: Przygotuj dedykowane środowisko do testów E2E (oddzielone od dev i prod)
- **Rola AI**: Pomoc w zaplanowaniu strategii środowisk
- **Opcje środowiska**:
  - Dedykowana instancja bazy danych (chmura lub lokalny kontener)
  - Separate auth provider project/tenant (jeśli używasz Auth-as-a-Service)
  - Izolowane storage/media files
- **Zmienne środowiskowe**:
  - Utwórz `.env.e2e` lub `.env.test`
  - Dodaj do `.gitignore` i `.cursorignore`
  - Zawiera: connection strings, API keys, test user credentials
- **Uwagi**:
  - To środowisko TYLKO dla testów E2E
  - Dane mogą być resetowane po każdej sesji testowej
  - Zapytaj AI o best practices dla wybranego stacku/platformy

#### Krok 2: Dodanie testowego użytkownika
- **Opis**: Utwórz konto testowe w systemie autentykacji
- **Metody**:
  - Przez admin panel auth providera
  - Przez API (script tworzący test usera)
  - Przez seed script (jeśli własny auth)
- **Dane testowe**:
  - Email: `e2e-test@example.com` (lub własny)
  - Password: bezpieczne hasło (zapisz w password manager lub .env.e2e)
  - Auto-confirm email (jeśli provider to wspiera)
- **Zmienne środowiskowe** (`.env.e2e`):
  - `E2E_USER_ID` (jeśli potrzebne)
  - `E2E_USERNAME` lub `E2E_EMAIL`
  - `E2E_PASSWORD`
- **Rola AI**: Pomoc w utworzeniu user creation script

#### Krok 3: Synchronizacja schematu bazy
- **Opis**: Wyrównaj schemat bazy danych środowiska E2E z lokalnym dev
- **Rola AI**: Pomoc w utworzeniu migration/setup script
- **Strategie**:
  - Uruchomienie migracji na środowisku E2E (jeśli framework migracji wspiera)
  - Eksport schematu z dev → import do E2E
  - Użycie narzędzia do schema sync (zależnie od bazy danych)
- **Weryfikacja**: Sprawdź czy wszystkie tabele/kolekcje zostały utworzone
- **Uwagi**:
  - Wykonuj sync po każdej nowej migracji
  - Zapytaj AI o komendy specyficzne dla twojego stacku/bazy

#### Krok 4: Konfiguracja frameworka E2E
- **Opis**: Skonfiguruj framework do testów E2E
- **Rola AI**: Pomoc w wyborze i konfiguracji narzędzia
- **Kluczowe pytania** (zapytaj AI):
  - Jaki framework E2E jest rekomendowany dla mojego stacku? (Playwright, Cypress, Selenium, Puppeteer, etc.)
  - Jak skonfigurować framework do używania zmiennych z `.env.e2e`?
  - Jak uruchomić aplikację w trybie testowym?
- **Konfiguracja**:
  - Wczytywanie zmiennych środowiskowych z `.env.e2e`
  - Base URL dla aplikacji (np. localhost:port lub staging URL)
  - Timeouty, retry logic, screenshots/videos przy failure
- **Skrypt uruchomieniowy**:
  - `test:e2e` - uruchamia aplikację + framework E2E
  - Aplikacja powinna używać `.env.e2e` (nie `.env` z dev)
- **Uwagi**: Zapytaj AI o przykładową konfigurację dla wybranego frameworka

#### Krok 5: Dodanie selektorów do UI
- **Opis**: Dodaj stabilne selektory do kluczowych elementów interfejsu
- **Rola AI**: Pomoc w strategii identyfikacji elementów
- **Strategie selekcji** (zapytaj AI o rekomendację):
  - Test IDs (data-testid, data-cy, test-id attributes)
  - ARIA labels (bardziej semantyczne, lepsze dla a11y)
  - Role attributes (button, link, textbox)
  - Text content (mniej stabilne, ale czasem wystarczające)
- **Zasada**: Dodawaj selektory **WEWNĄTRZ** komponentów, nie na zewnątrz
- **Przykład konceptualny**:
  ```
  Component Header:
    <header [selector="topbar"]>
      <button [selector="logout-button"]>Logout</button>
    </header>
  ```
- **Uwagi**:
  - Framework E2E używa selektorów do znajdowania elementów
  - Selektory powinny być stabilne (nie zmieniać się przy refaktoryzacji)
  - Zapytaj AI o best practices dla wybranego stacku/frameworka

#### Krok 6: Implementacja Page Object Models (POM)
- **Opis**: Utwórz klasy/moduły reprezentujące strony aplikacji (wzorzec Page Object Model)
- **Rola AI**: Generowanie POM na podstawie struktury UI
- **Struktura**: `tests/pom/` lub `e2e/pages/`
- **Przykład konceptualny**:
  ```
  LoginPage:
    method navigate() → otwiera stronę logowania
    method login(email, password) → wypełnia formularz i klika submit
    method getErrorMessage() → zwraca tekst błędu

  DashboardPage:
    method isLoaded() → sprawdza czy dashboard się załadował
    method getUserName() → zwraca nazwę zalogowanego użytkownika
  ```
- **Uwagi**:
  - POM oddziela logikę testów od szczegółów UI
  - Dla SPA: POM = strony/widoki
  - Dla single-page apps: POM = główne komponenty/sekcje
  - Łatwiejsza maintenance (zmiana UI → update tylko w POM)

#### Krok 7: Implementacja testów E2E
- **Opis**: Zaimplementuj scenariusze testowe weryfikujące kluczowe user flows
- **Prompt**: Wykorzystaj prompty z testów jednostkowych oraz Page Object Models
- **Rola AI**: Generowanie testów na podstawie Test Planu i POM
- **Struktura testów**:
  - Jeden plik testowy = jeden user flow lub feature
  - Używaj POM do interakcji z UI (nie bezpośrednich selektorów)
  - Testuj happy paths + edge cases + error scenarios
- **Przykładowe scenariusze**:
  - User can register and login
  - User can create/edit/delete resource
  - User sees error message for invalid input
  - User can navigate between pages
- **Kluczowe zasady**:
  - Testuj zachowanie (behavior), nie implementację
  - Unikaj testowania szczegółów UI (kolory, fonty) - focus na funkcjonalność
  - Każdy test powinien być niezależny (może działać w izolacji)
- **Uwagi**:
  - Commituj testy razem z features
  - Aktualizuj testy przy zmianach w user flows

#### Krok 8: Konfiguracja teardown (czyszczenie danych)
- **Opis**: Dodaj mechanizm czyszczenia danych testowych po zakończeniu sesji E2E
- **Rola AI**: Pomoc w implementacji teardown script
- **Strategie czyszczenia**:
  - Global teardown: wykonuje się raz po wszystkich testach
  - Per-test cleanup: każdy test czyści po sobie
  - Database reset: przywrócenie bazy do stanu początkowego (seed data)
- **Implementacja** (zapytaj AI):
  - Jak zaimplementować global teardown w moim frameworku E2E?
  - Jak połączyć się z bazą danych i usunąć dane testowe?
  - Czy powinienem używać API czy bezpośrednie zapytania DB?
- **Uwagi**:
  - Zaloguj się jako testowy użytkownik przed usuwaniem (row-level security)
  - NIE używaj admin/root credentials jeśli to możliwe (bezpieczeństwo)
  - Dla teamów: rozważ osobnych użytkowników E2E dla każdego dewelopera
  - Alternatywa: resetuj całą bazę E2E do snapshot'u zamiast ręcznego czyszczenia

---

### [3x4] Refaktoryzacja i optymalizacja z AI

#### Krok 1: Analiza złożoności z "AI Detektywem"
- **Opis**: Użyj agenta AI do znalezienia najdłuższych plików i najbardziej skomplikowanych modułów
- **Prompt**: [Analiza Złożoności Komponentów](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=f3391adb-6ae4-41ec-aedd-9d23964fd704)
- **Narzędzia**: Agent z dostępem do narzędzi terminalowych (find, wc, grep, cloc)
- **Zakres analizy**:
  - Najdłuższe pliki (>300 linii)
  - Komponenty z największą liczbą zależności
  - Duplikacja kodu
  - Naruszenia Single Responsibility Principle
- **Uwagi**:
  - Uruchom w trybie agenta (Agent mode w edytorze)
  - Model użyje narzędzi do analizy kodu
  - Zapisz raport analizy w `.ai/refactor-analysis.md`

#### Krok 2: Refaktoryzacja formularzy (opcjonalnie)
- **Opis**: Wydziel logikę walidacji i state management z komponentów UI
- **Prompt**: [Plan Refaktoryzacji Formularzy](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=80d351f0-ec77-4776-9a77-fbb03e533b07)
- **Rola AI**: Analiza obecnej struktury formularzy i zaproponowanie refaktoryzacji
- **Cel refaktoryzacji**:
  - Oddzielenie logiki od prezentacji
  - Walidacja w dedykowanym miejscu (schema, validators)
  - State management oddzielony od UI
  - Komponenty UI skupione tylko na renderowaniu
- **Przed refaktoryzacją** (anti-pattern):
  ```
  Component FormComponent:
    - Zarządza stanem (local state)
    - Waliduje (manualna logika lub inline)
    - Komunikuje się z API (fetch/axios)
    - Obsługuje błędy
    - Renderuje UI
  ```
- **Po refaktoryzacji** (best practice):
  ```
  - FormComponent (tylko UI: renderowanie pól)
  - formSchema (walidacja: reguły, error messages)
  - useForm / FormController (state management, submit handling)
  - formService (API calls)
  ```
- **Kluczowe pytania** (zapytaj AI):
  - Jakie narzędzia do zarządzania formularzami są rekomendowane dla mojego stacku?
  - Jak oddzielić walidację od UI w moim frameworku?
  - Jak zorganizować state management formularzy?
- **Uwagi**:
  - Refaktoryzuj stopniowo (formularz po formularzu)
  - Commituj po każdym działającym kroku
  - Uruchom testy po refaktoryzacji

#### Krok 3: Responsywność UI (opcjonalnie)
- **Opis**: Dodaj responsywną nawigację i layout dla urządzeń mobilnych
- **Rola AI**: Analiza UI i propozycje rozwiązań responsywności
- **Podejście**:
  1. Zrób screenshot obecnego UI (desktop)
  2. Zapytaj model o propozycje rozwiązań responsywności
  3. Oceń dostępność (a11y) i UX każdego rozwiązania
  4. Wygeneruj specyfikację wybranego rozwiązania
  5. Zaimplementuj
- **Prompty**:
  - [Ocena Dostępności](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=1373b4bb-e85e-4ff0-8560-3749a153c41a)
  - [Specyfikacja Nawigacji Mobilnej](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=ba905c95-e59c-4c50-915d-33c1675b9e57)
  - [Implementacja Nawigacji Mobilnej](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=0961cf8a-64c0-4f2d-87dd-2f9e190ae06e)
- **Kluczowe obszary**:
  - Nawigacja (hamburger menu, bottom nav, drawer)
  - Layout (grid, flexbox, container queries)
  - Typography (fluid font sizes)
  - Images (responsive images, lazy loading)
- **Testowanie**:
  - Narzędzia dev tools przeglądarki (responsive mode)
  - Fizyczne urządzenia (jeśli dostępne)
  - Emulatory mobilne
- **Uwagi**: Zapytaj AI o best practices dla responsywności w twoim stacku

#### Krok 4: Migracja do nowszej wersji frameworka (opcjonalnie)
- **Opis**: Wykorzystaj oficjalny migration guide jako kontekst dla AI
- **Rola AI**: Ocena migracji i pomoc w implementacji
- **Metodyka**:
  1. Znajdź oficjalny migration guide dla twojego frameworka
  2. Dodaj jako kontekst dla AI (Custom Docs w edytorze lub wklej do promptu)
  3. Zapytaj AI o ocenę migracji dla twojego projektu
  4. Jeśli pozytywna: zaplanuj i wykonaj migrację w iteracjach
- **Prompt**: [Ocena Migracji Framework](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=a058e099-0a27-4aa4-9642-e95db490959c)
- **Kluczowe pytania** (zapytaj AI):
  - Jakie breaking changes wprowadza nowa wersja?
  - Które części mojego projektu wymagają zmian?
  - Jaki jest szacowany effort migracji?
  - Czy warto migrować teraz czy poczekać?
- **Uwagi**:
  - Najpierw ANALIZA (czy warto?), potem implementacja
  - Migration guides to świetny kontekst dla AI (szczegółowe, oficjalne)
  - Testuj po każdym kroku migracji

#### Krok 5: Implementacja zabezpieczeń na poziomie bazy
- **Opis**: Zabezpiecz dane użytkowników na poziomie bazy danych (defense in depth)
- **Prompt**: [Migracja Row Level Security](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l4-refactor&prompt=3ae72005-117a-4b04-9dcd-3f74e10903bd)
- **Rola AI**: Analiza obecnej konfiguracji i zaproponowanie mechanizmów bezpieczeństwa
- **Kluczowe mechanizmy** (zapytaj AI o implementację):
  - Row-level security / Tenant isolation (multi-tenancy)
  - Polityki dostępu (CRUD permissions per user/role)
  - Audit logs (kto, kiedy, co zmienił)
  - Encryption at rest (dla wrażliwych danych)
- **Strategia implementacji**:
  - Zdefiniuj polityki bezpieczeństwa w `.ai/security-plan.md`
  - Wygeneruj migrację/script implementujący polityki
  - Przetestuj: czy user A widzi tylko swoje dane?
- **Przykład konceptualny** (row-level security):
  ```
  Policy: Users can read only their own records
  Condition: current_user_id = record.user_id

  Policy: Users can create records
  Condition: new_record.user_id = current_user_id
  ```
- **Uwagi**:
  - To dodatkowa warstwa bezpieczeństwa poza backendem
  - Bez tych mechanizmów: backend to single point of failure
  - Zapytaj AI o best practices dla twojej bazy danych

---

### [3x5] Konfiguracja CI/CD z AI

#### Krok 1: Poznanie konceptów CI/CD
- **Opis**: Zapoznaj się z podstawowymi pojęciami CI/CD
- **Kluczowe koncepty**:
  - **Pipeline**: Automatyczny proces budowania, testowania i wdrażania
  - **Trigger/Event**: Zdarzenie wyzwalające pipeline (push, PR, schedule, manual)
  - **Stage/Job**: Zestaw kroków wykonywanych sekwencyjnie lub równolegle
  - **Step/Task**: Pojedyncze zadanie (install deps, run tests, deploy)
  - **Runner/Agent**: Serwer wykonujący pipeline
  - **Artifact**: Wynik buildu (binary, bundle, container image)
- **Popularne platformy CI/CD**:
  - GitHub Actions (YAML, zintegrowane z GitHub)
  - GitLab CI (YAML, zintegrowane z GitLab)
  - CircleCI (YAML, chmura + self-hosted)
  - Jenkins (Groovy/Declarative, self-hosted)
  - Travis CI (YAML, chmura)
- **Uwagi**:
  - Wybierz platformę zgodną z twoim Git provider
  - Lub niezależną (CircleCI, Jenkins) jeśli potrzebujesz flexibility

#### Krok 2: Pierwszy scenariusz testowy (Hello World)
- **Opis**: Utwórz prosty pipeline reagujący na push do głównej gałęzi
- **Rola AI**: Pomoc w utworzeniu basic pipeline
- **Cel**: Zrozumienie podstaw składni i weryfikacja że pipeline działa
- **Koncepcja** (uniwersalny przykład):
  ```
  Pipeline: Hello World
  Trigger: push to main/master branch
  Job: hello
    Runner: Linux (lub Windows/macOS)
    Steps:
      1. Checkout code
      2. Run command: echo "Hello, CI/CD!"
  ```
- **Weryfikacja**:
  - Zrób commit i push na główną gałąź
  - W panelu CI/CD sprawdź wykonanie pipeline
- **Uwagi**:
  - Ten pipeline wykona się po każdym pushu
  - Zapytaj AI o składnię dla wybranej platformy CI/CD

#### Krok 3: Pull Request Pipeline (WYMAGANE DO CERTYFIKATU)
- **Opis**: Utwórz pipeline weryfikujący każdy Pull Request przed merge'em do głównej gałęzi
- **Prompt**: [Workflow CI/CD Pull Request](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l5-cicd&prompt=bcbd3637-ed8f-449b-a2c4-aa3057f6af34)
- **Rola AI**: Generowanie konfiguracji pipeline zgodnej z wybraną platformą
- **Zakres minimum** (dla certyfikatu):
  - Linting (code quality checks)
  - Unit Tests
- **Zakres full**:
  - Linting
  - Unit Tests
  - E2E Tests
  - Security scanning (opcjonalnie)
  - Code coverage report (opcjonalnie)
  - Komentarz ze statusem na PR (opcjonalnie)
- **Koncepcja struktury**:
  ```
  Pipeline: Pull Request CI
  Trigger: pull_request to main/master

  Job: lint
    Steps:
      1. Checkout code
      2. Setup runtime (Node, Python, PHP, Ruby, etc.)
      3. Install dependencies
      4. Run linter

  Job: test
    Steps:
      1. Checkout code
      2. Setup runtime
      3. Install dependencies
      4. Run unit tests

  Job: e2e (opcjonalnie)
    Steps:
      1. Checkout code
      2. Setup runtime + dependencies
      3. Setup E2E environment (database, services)
      4. Run E2E tests
  ```
- **Kluczowe decyzje** (zapytaj AI):
  - Czy joby mają działać równolegle czy sekwencyjnie?
  - Jak konfigurować zmienne środowiskowe dla testów?
  - Jak raportować wyniki (failures, coverage)?
- **Uwagi**:
  - Joby równoległe = szybszy pipeline
  - Użyj zależności (Job B czeka na Job A) jeśli potrzebne
  - Pipeline powinien blokować merge przy failure

#### Krok 4: Konfiguracja sekretów środowiskowych
- **Opis**: Dodaj zmienne środowiskowe i sekrety dla pipeline
- **Rola AI**: Pomoc w konfiguracji secrets zgodnie z platformą CI/CD
- **Typy sekretów**:
  - **Repository/Project secrets**: Dostępne we wszystkich pipelines
  - **Environment secrets**: Specyficzne dla środowiska (production, staging, e2e)
- **Przykładowe sekrety**:
  - Database credentials dla testów E2E
  - API keys dla zewnętrznych serwisów
  - Deployment credentials (cloud provider tokens)
- **Kluczowe zasady**:
  - Sekrety są szyfrowane (nie widać plain text)
  - Nie wyświetlają się w logach pipeline
  - Używaj środowisk (environments) dla separacji (dev/staging/prod)
- **Użycie w pipeline**:
  - Przekazywanie sekretów jako zmienne środowiskowe do jobów
  - Dostęp przez syntax specyficzny dla platformy
- **Uwagi**:
  - NIGDY nie commituj sekretów do repo
  - Regularnie rotuj sekrety (co 3-6 miesięcy)
  - Ustaw limity kredytowe na kluczach API

---

### [3x6] Deployment na produkcję z AI

#### Krok 1: Feature Flags (OPCJONALNIE)
- **Opis**: Wdróż system flag do rozdzielenia deployment (wdrożenie kodu) od release (udostępnienie funkcji użytkownikom)
- **Prompt**: [Projektowanie Systemu Feature Flags](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l6-deploy&prompt=331a5467-84a2-4114-8d6d-63277e4e2840)
- **Przypadki użycia**:
  - Kod na produkcji, ale funkcja ukryta (pending release)
  - Stopniowe włączanie funkcji (beta testers)
  - A/B testing
  - Szybkie wyłączenie problematycznej funkcji (bez rollbacku całego deployment)
- **Implementacja** (zapytaj AI o rekomendacje):
  - DIY: plik konfiguracyjny JSON/YAML per środowisko
  - SaaS: LaunchDarkly, Flagsmith, Split.io
  - Framework-specific: Next.js flags, Laravel Feature, Django Waffle
- **Uwagi**:
  - To zaawansowana technika dla projektów na produkcji
  - Dla MVP możesz pominąć ten krok

#### Krok 2: Analiza platform hostingowych
- **Opis**: Porównaj dostępne opcje wdrożenia i wybierz najlepszą dla twojego projektu
- **Rola AI**: Pomoc w porównaniu platform zgodnie z wymaganiami projektu
- **Prompt**: Zapytaj AI o porównanie platform dla twojego stacku
- **Kryteria wyboru**:
  - **Koszt**: free tier, pay-as-you-go, fixed pricing
  - **Stack compatibility**:
    - Serverless (Functions-as-a-Service) - dla frameworków wspierających edge/serverless
    - Containers (Docker) - dla dowolnego stacku
    - Platform-as-a-Service (PaaS) - łatwy deployment, ograniczona kontrola
    - Virtual Private Server (VPS) - pełna kontrola, wymaga ops knowledge
  - **Skalowalność**: auto-scaling, limity requestów, geograficzna dystrybucja
  - **CI/CD integration**: git-based deployment, webhooks, API
  - **Dodatkowe usługi**: CDN, SSL, monitoring, logs, backups
- **Pytania do AI**:
  - "Jaka platforma hostingowa jest rekomendowana dla [twój stack]?"
  - "Porównaj opcje serverless vs containers dla mojego projektu"
  - "Jakie są trade-offy między PaaS a VPS?"
- **Uwagi**:
  - Zaktualizuj `README.md` / `.ai/tech-stack.md` o wybraną platformę
  - Dla MVP: rozpocznij od darmowych/tanich opcji
  - Sprawdź vendor lock-in (jak łatwo zmienić platformę w przyszłości?)

---

#### Ścieżka A: Deployment serverless

#### Krok 3A: Konfiguracja projektu na platformie
- **Opis**: Załóż konto, podłącz repozytorium, skonfiguruj zmienne środowiskowe
- **Rola AI**: Pomoc w konfiguracji zgodnie z wybraną platformą
- **Kroki** (uniwersalny workflow):
  1. Utwórz konto na wybranej platformie serverless
  2. Podłącz repozytorium Git (autoryzacja GitHub/GitLab/Bitbucket)
  3. Wybierz framework preset (jeśli dostępny) lub skonfiguruj manualnie:
     - Build command (np. `npm run build`, `bundle exec rake assets:precompile`)
     - Build output directory (np. `dist`, `build`, `public`)
  4. Skonfiguruj zmienne środowiskowe:
     - Production environment: database URL, API keys, secrets
     - Preview environment (opcjonalnie): dla PR previews
- **Kluczowe funkcje** (sprawdź czy platforma wspiera):
  - Automatyczne deployment przy push na główną gałąź
  - Preview deployments dla Pull Requestów
  - Rollback do poprzedniej wersji
  - Custom domains i SSL/TLS
- **Uwagi**:
  - Zapytaj AI o szczegółową instrukcję dla wybranej platformy
  - Zapisz konfigurację w dokumentacji projektu

#### Krok 4A: Konfiguracja frameworka dla serverless (jeśli wymagane)
- **Opis**: Skonfiguruj framework do działania w środowisku serverless (jeśli wymagane)
- **Rola AI**: Pomoc w konfiguracji frameworka dla serverless
- **Kluczowe pytania** (zapytaj AI):
  - Czy mój framework wymaga specjalnego adaptera/konfiguracji dla serverless?
  - Jakie opcje renderowania są dostępne (SSR, SSG, hybrid)?
  - Jak framework obsługuje environment variables w serverless?
- **Typowe wymagania**:
  - Instalacja adapter package (jeśli framework ma plugin system)
  - Konfiguracja output mode (server, static, hybrid)
  - Dostosowanie build process (bundling, code splitting)
- **Uwagi**:
  - Nie wszystkie frameworki potrzebują adaptera (Next.js, Nuxt mają built-in)
  - Zapytaj AI o oficjalną dokumentację deploymentu dla twojego frameworka

#### Krok 5A: Konfiguracja zmiennych środowiskowych
- **Opis**: Skonfiguruj dostęp do zmiennych środowiskowych w aplikacji
- **Rola AI**: Pomoc w implementacji zgodnie z frameworkiem i platformą
- **Problem**: Różne środowiska serverless mają różne sposoby obsługi env variables
- **Kluczowe pytania** (zapytaj AI):
  - Jak mój framework czyta zmienne środowiskowe w serverless?
  - Czy platforma wymaga specjalnej konfiguracji (prefixes, namespaces)?
  - Jak oddzielić public variables (dostępne w przeglądarce) od server-only?
- **Strategie**:
  - Framework-native solution (jeśli dostępny)
  - Platform-specific injection (zmienne wstrzykiwane w runtime)
  - Build-time replacement (zamiana podczas budowania)
- **Uwagi**:
  - Zmienne powinny być definiowane w panelu platformy (nie w .env commitowanym do repo)
  - Testuj lokalnie przed deploymentem
  - Dokumentuj wymagane zmienne w README.md

#### Krok 6A: Sprawdzenie kompatybilności dependencies
- **Opis**: Sprawdź kompatybilność zależności z środowiskiem serverless
- **Rola AI**: Analiza dependencies pod kątem compatibility
- **Kluczowe problemy serverless**:
  - Brak pełnego Node.js API (niektóre platformy ograniczają fs, child_process, etc.)
  - Timeouty wykonania (limity czasu: 10s, 30s, 60s zależnie od platformy)
  - Cold starts (pierwsze wywołanie funkcji jest wolniejsze)
  - Rozmiar bundle (limity: 1MB, 10MB, 50MB)
- **Pytania do AI**:
  - "Czy moje dependencies są kompatybilne z [platforma serverless]?"
  - "Które pakiety mogą powodować problemy w serverless?"
  - "Jak zoptymalizować bundle size dla serverless?"
- **Rozwiązania problemów**:
  - Zamień problematyczne pakiety na alternatywy (lightweight, edge-compatible)
  - Użyj polyfills (jeśli platforma to wspiera)
  - Przenieś heavy operations do background jobs/webhooks
- **Uwagi**: Zapytaj AI o limitations wybranej platformy serverless

#### Krok 7A: Master Branch Deployment Pipeline
- **Opis**: Utwórz pipeline CI/CD wdrażający główną gałąź na produkcję
- **Prompt**: [Konfiguracja Deploymentu Serverless](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l6-deploy&prompt=0d6b5d9d-334e-4e95-b3a1-66f70f9a0c2b) (przykład dla Cloudflare Pages)
- **Rola AI**: Generowanie konfiguracji pipeline dla wybranej platformy CI/CD i hostingu
- **Koncepcja struktury**:
  ```
  Pipeline: Deploy to Production
  Trigger: push to main/master branch

  Job: quality-checks
    Steps:
      1. Checkout code
      2. Setup runtime + install deps
      3. Run linter
      4. Run unit tests
      5. (opcjonalnie) Run E2E tests

  Job: deploy
    Depends on: quality-checks (czeka aż testy przejdą)
    Steps:
      1. Checkout code
      2. Setup runtime + install deps
      3. Build application
      4. Deploy to serverless platform (CLI/API/SDK)
  ```
- **Kluczowe decyzje**:
  - Czy deployment jest automatyczny (push → deploy) czy manualny (approval gate)?
  - Jak przekazać credentials platformy hostingowej (sekrety CI/CD)?
  - Czy notyfikować team o deploymencie (Slack, email)?
- **Pytania do AI**:
  - "Jak skonfigurować deployment do [platforma] z [CI/CD platform]?"
  - "Jakie credentials potrzebuję dla automated deployment?"
  - "Jak zrobić rollback jeśli deployment się nie powiedzie?"
- **Uwagi**:
  - Opcjonalnie wyłącz automatyczne deploymenty w panelu platformy (kontrola tylko przez CI/CD)
  - Zapisz deployment URL i credentials jako sekrety CI/CD

#### Krok 8A: Konfiguracja monitoring i logging
- **Opis**: Konfiguruj monitoring i logging dla produkcji
- **Rola AI**: Pomoc w konfiguracji observability
- **Kluczowe obszary**:
  - **Logs**: gdzie trafiają logi z aplikacji? (stdout, provider dashboard, external service)
  - **Errors**: jak są raportowane błędy? (error tracking: Sentry, Rollbar, Bugsnag)
  - **Metrics**: request count, latency, error rate (provider dashboard lub Datadog/Grafana)
  - **Tracing**: distributed tracing dla debugging performance (opcjonalnie)
- **Pytania do AI**:
  - "Jak skonfigurować logging dla [framework] na [platforma serverless]?"
  - "Jak zintegrować [Sentry/Rollbar] z moją aplikacją?"
  - "Gdzie znajdę real-time logs w [platforma] dashboard?"
- **Strategie debugowania produkcji**:
  - Używaj structured logging (JSON format)
  - Dodaj request ID do każdego loga (tracing requestów)
  - Monitoruj error rate i latency metrics
  - Setup alerts dla critical errors (email, Slack, PagerDuty)
- **Uwagi**:
  - console.log() w kodzie trafia do provider logs
  - Testuj logging lokalnie przed deploymentem

---

#### Ścieżka B: Deployment z kontenerami (Docker)

#### Krok 3B: Generowanie Dockerfile
- **Opis**: Wygeneruj Dockerfile dopasowany do stacku technologicznego
- **Rola AI**: Generowanie Dockerfile zgodnego z best practices
- **Prompt**: Zapytaj AI o Dockerfile dla twojego stacku z multi-stage build
- **Kluczowe elementy** (zapytaj AI):
  - Base image (oficjalny obraz dla twojego runtime: node, python, php, ruby, etc.)
  - Multi-stage build (zmniejszenie rozmiaru obrazu)
  - Instalacja dependencies (tylko production deps w final stage)
  - Build aplikacji (kompilacja, bundling)
  - Runtime configuration (port, CMD/ENTRYPOINT)
- **Przykład konceptualny** (multi-stage):
  ```dockerfile
  # Stage 1: Build
  FROM [runtime]:[version] AS builder
  WORKDIR /app
  COPY dependency-files ./
  RUN install-dependencies
  COPY source-code ./
  RUN build-application

  # Stage 2: Runtime
  FROM [runtime]:[version]-slim
  WORKDIR /app
  COPY --from=builder /app/build ./
  EXPOSE [port]
  CMD ["start-command"]
  ```
- **Uwagi**:
  - NIE kopiuj .env do obrazu (sekrety przez env variables w runtime)
  - Użyj .dockerignore (node_modules, .git, .env, tests)
  - Zapytaj AI o optimization tips dla twojego stacku

#### Krok 4B: Testowanie lokalnie
- **Opis**: Zbuduj i uruchom kontener lokalnie aby przetestować
- **Komendy** (generic):
  ```bash
  # Build obrazu
  docker build -t my-app .

  # Uruchomienie z env variables
  docker run -p [host-port]:[container-port] \
    -e DATABASE_URL=... \
    -e API_KEY=... \
    my-app
  ```
- **Weryfikacja**: Otwórz `http://localhost:[host-port]`
- **Uwagi**:
  - Zmienne przekazuj przez `-e` lub `--env-file`
  - NIE hard-coduj sekretów w Dockerfile

#### Krok 5B: Publikacja obrazu na Container Registry
- **Opis**: Opublikuj obraz Docker na wybranym Container Registry
- **Rola AI**: Pomoc w wyborze registry i konfiguracji
- **Popularne opcje**:
  - **Docker Hub**: darmowy dla public images, płatny dla private
  - **GitHub Container Registry (ghcr.io)**: zintegrowany z GitHub, darmowy dla public
  - **GitLab Container Registry**: zintegrowany z GitLab
  - **AWS ECR, Google GCR, Azure ACR**: chmurowe registries
- **Komendy** (generic):
  ```bash
  # Login do registry
  docker login [registry-url] -u [username] -p [token]

  # Tag obrazu
  docker tag my-app [registry-url]/[namespace]/my-app:[tag]

  # Push
  docker push [registry-url]/[namespace]/my-app:[tag]
  ```
- **Pytania do AI**:
  - "Które Container Registry jest najlepsze dla mojego projektu?"
  - "Jak skonfigurować authentication do [registry]?"
  - "Jak zautomatyzować push obrazów w CI/CD?"
- **Uwagi**:
  - Dla projektów open-source: public registry (darmowy)
  - Dla projektów komercyjnych: private registry (sprawdź limity free tier)

#### Krok 6B: Konfiguracja platformy dla kontenerów
- **Opis**: Wybierz platformę wspierającą deployment kontenerów i skonfiguruj projekt
- **Rola AI**: Pomoc w wyborze platformy i konfiguracji
- **Popularne platformy dla kontenerów**:
  - **Platform-as-a-Service (PaaS)**:
    - Railway, Render, Fly.io - łatwy deployment z Git lub registry
    - Google Cloud Run, AWS App Runner, Azure Container Apps - cloud providers
  - **Kubernetes-based**:
    - Google GKE, AWS EKS, Azure AKS - dla większych aplikacji
    - DigitalOcean Kubernetes, Linode LKE - managed K8s
  - **VPS + Docker**:
    - DigitalOcean Droplet, Linode, Hetzner - pełna kontrola, wymaga ops
- **Kroki konfiguracji** (generic):
  1. Utwórz projekt/aplikację w platformie
  2. Podłącz Container Registry (jeśli zewnętrzny)
  3. Wybierz image: `[registry]/[namespace]/my-app:latest`
  4. Skonfiguruj resources (CPU, RAM, auto-scaling)
  5. Dodaj Environment Variables (database URL, API keys)
  6. Opcjonalnie: custom domain, SSL
- **Pytania do AI**:
  - "Którą platformę wybrać dla kontenera [framework]?"
  - "Jakie są koszty deploymentu kontenera na [platforma]?"
  - "Jak skonfigurować auto-scaling dla kontenerów?"
- **Uwagi**:
  - PaaS jest prostszy (mniej ops), ale droższy
  - VPS daje kontrolę, ale wymaga zarządzania infrastrukturą

#### Krok 7B: Generowanie credentials dla automated deployment
- **Opis**: Wygeneruj API token/credentials dla automatycznego deploymentu z CI/CD
- **Rola AI**: Pomoc w konfiguracji zgodnie z wybraną platformą
- **Kroki** (generic):
  1. W panelu platformy: Settings/API/Tokens
  2. Wygeneruj token z odpowiednimi uprawnieniami (deploy, manage apps)
  3. Zapisz token jako sekret w CI/CD platform
- **Przykładowe sekrety dla CI/CD**:
  - `PLATFORM_API_TOKEN` lub `PLATFORM_ACCESS_KEY`
  - `PLATFORM_APP_ID` lub `PLATFORM_PROJECT_ID` (jeśli wymagane)
  - `REGISTRY_USERNAME` i `REGISTRY_TOKEN` (dla push obrazów)
- **Pytania do AI**:
  - "Jak wygenerować API token w [platforma]?"
  - "Jakie uprawnienia potrzebuje token dla deploymentu?"
  - "Jak bezpiecznie przechowywać credentials dla CI/CD?"
- **Uwagi**:
  - Token pozwala CI/CD wywoływać API platformy (deployment, rollback)
  - NIGDY nie commituj tokenów do repo
  - Używaj tokenów z ograniczonymi uprawnieniami (principle of least privilege)

#### Krok 8B: Master Branch Pipeline z Dockerem
- **Opis**: Utwórz pipeline budujący obraz Docker i wdrażający na wybraną platformę
- **Prompt**: [Pipeline Deploymentu Docker](https://10xrules.ai/prompts?org=10xdevs&collection=m3-prod&segment=l6-deploy&prompt=ca4d09a8-2a85-439d-84ef-1eb2e855a5ff) (przykład dla DigitalOcean)
- **Rola AI**: Generowanie konfiguracji pipeline dla wybranej platformy CI/CD
- **Koncepcja struktury**:
  ```
  Pipeline: Docker Deploy to Production
  Trigger: push to main/master branch

  Job: quality-checks
    Steps:
      1. Checkout code
      2. Setup runtime + install deps
      3. Run linter
      4. Run unit tests

  Job: build-and-push
    Depends on: quality-checks
    Steps:
      1. Checkout code
      2. Login to Container Registry
      3. Build Docker image
      4. Tag image with version (e.g., git commit SHA)
      5. Push image to registry

  Job: deploy
    Depends on: build-and-push
    Steps:
      1. Trigger deployment na platformie (API call / CLI)
      2. Czekaj na potwierdzenie sukcesu
      3. (opcjonalnie) Healthcheck deployed app
      4. (opcjonalnie) Notify team (Slack, email)
  ```
- **Kluczowe decyzje**:
  - Tagging strategy: `latest`, `v1.2.3`, `commit-sha`, `branch-name`
  - Deployment method: API call, CLI tool, webhook
  - Rollback strategy: jak wrócić do poprzedniej wersji?
- **Pytania do AI**:
  - "Jak skonfigurować Docker build w [CI/CD platform]?"
  - "Jak zautomatyzować deployment do [hosting platform]?"
  - "Jaką strategię tagowania obrazów powinienem użyć?"
- **Uwagi**:
  - 3 joby: quality → build → deploy (sekwencyjnie dla bezpieczeństwa)
  - Obraz publikowany z unikalnym tagiem (nie tylko `latest`)
  - Platforma hostingowa pobiera nowy obraz i wdraża

---

## Zasoby i narzędzia

### Narzędzia i biblioteki
- **10xRules.ai Prompt Library**: https://10xrules.ai/
- **10x-Magic-Docs**: https://github.com/przeprogramowani/10x-magic-docs
- **GitIngest**: https://gitingest.com/
- **Google AI Studio**: https://aistudio.google.com/ (FREE dla osobistych projektów)

### Dokumentacja
Znajdź dokumentację dla wybranego stacku i narzędzi w oficjalnych źródłach:
- Framework frontendowy i backendowy
- Baza danych
- Auth provider (jeśli używasz Auth-as-a-Service)
- Framework testowy (unit + E2E)
- Platforma CI/CD
- Platforma hostingowa

**Tip**: Zapytaj AI "Gdzie znajdę oficjalną dokumentację dla [technologia]?"

**Tip**: Używaj Context7 w edytorach AI dla dostępu do aktualnej dokumentacji

### Społeczność
- **Dyskusje - praktyka [10X]**: Zadawaj pytania o zadania praktyczne
- **Dyskusje - ogólne [10X]**: Ogólne dyskusje o AI i 10xDevs

---

## Zasady pracy

### Bezpieczeństwo
- ❌ NIGDY nie commituj plików `.env*` ani innych plików z sekretami do repozytorium
- ✅ Dodaj `.env*` do `.gitignore` i do ignore files edytorów AI
- ✅ Używaj sekretów platformy CI/CD dla danych wrażliwych w pipeline
- ✅ Ustaw limity kredytowe na kluczach API providers (np. LLM API: $1-5 limit)
- ✅ Włącz Privacy Mode w edytorach AI (jeśli dostępne)
- ✅ Regularnie rotuj klucze API (co 3-6 miesięcy)
- ✅ Używaj environment-specific credentials (dev, staging, prod)
- ✅ Nigdy nie loguj sekretów (API keys, passwords, tokens)

### Workflow Git
- ✅ Stosuj Conventional Commits:
  - `feat:` - nowa funkcjonalność
  - `fix:` - naprawa błędu
  - `chore:` - maintenance (dependencies, config)
  - `docs:` - dokumentacja
  - `refactor:` - refaktoryzacja bez zmian funkcjonalności
- ✅ Commituj zmiany po każdym działającym etapie
- ✅ Twórz checkpointy przed dużymi refaktoryzacjami
- ✅ Nazywaj branche opisowo (feat/auth, fix/login-error)

### Współpraca z AI (workflow 3×3)
- ✅ Zawsze przekazuj kontekst: PRD, tech-stack, db-plan, api-plan, ui-plan
- ✅ Używaj tagów XML dla strukturyzacji promptów
- ✅ Odwołuj się do plików przez `@` w edytorach AI
- ✅ Workflow 3×3:
  1. 3 kroki implementacji
  2. Code review + feedback
  3. Następne 3 kroki
  4. Repeat...
- ✅ Jeśli model się gubi:
  1. Zatrzymaj pracę
  2. Utwórz plik ze statusem implementacji
  3. Kontynuuj w nowym wątku z kontekstem statusu

### Wybór modeli AI
- **Planning & Architecture**: Modele reasoningowe (extended thinking)
- **Coding**: Wysokiej jakości coding models (state-of-the-art)
- **Quick tasks**: Szybkie modele (lower latency, niższy koszt)
- **Context-heavy**: Duże context window (2M+ tokens)
- **Tip**: Zapytaj AI "Który model jest najlepszy dla [typ zadania]?" przed rozpoczęciem pracy

### Testowanie
- ✅ Testy dodawaj na bieżąco, NIE na końcu projektu
- ✅ Unit testy: logika biznesowa, utils, serwisy
- ✅ E2E testy: user flows, krytyczne ścieżki
- ✅ Dedykowana baza dla E2E (nie local, nie prod)
- ✅ Czyszczenie danych testowych po każdej sesji (teardown)
- ❌ NIE testuj: prostych komponentów prezentacyjnych, third-party

---

## Najczęstsze pytania (FAQ)

**Q: Jaki stack technologiczny wybrać dla projektu produkcyjnego?**
A: Checklist jest uniwersalny - wybierz stack który:
  - Znasz dobrze lub chcesz się nauczyć
  - Ma aktywną społeczność i dobre wsparcie AI (dokumentacja)
  - Wspiera szybki development i łatwy deployment
  - Ma dojrzałe ekosystemy (testing, CI/CD, hosting)

Nie ma "najlepszego" stacku - każdy ma swoje trade-offs.

**Q: Czy muszę publikować aplikację na produkcję?**
A: Dla certyfikatu podstawowego NIE. Dla certyfikatu z wyróżnieniem TAK.

**Q: Ile kosztuje wdrożenie projektu na produkcję?**
A: **Minimum**: $0-5/m
  - Baza danych: darmowe plany cloud providers lub self-hosted
  - LLM (jeśli używane): darmowe limity większości providerów
  - Hosting:
    - Serverless: darmowe tier'y (z limitami requestów/compute)
    - Containers: od $0 (free tier PaaS) do $5-15/m
    - VPS: od $5/m (basic droplet)
  - CI/CD: darmowy w większości platform (limity minut/buildy)

**Maksimum dla MVP**: $15-50/m
  - Zależy od wybranego stacku, intensywności użycia LLM, traffic
  - Większość kosztów: compute (hosting) i LLM API calls

**Q: Jak długo zajmie zrealizowanie checklisty?**
A: Przy pracy 10-15h/tydzień: 1-2 tygodnie

**Q: Co jeśli utknę na którymś kroku?**
A: Zadaj pytanie w sekcji #Dyskusje - praktyka [10X] na platformie Circle. Społeczność i team 10xDevs pomogą!

---

**Powodzenia w wdrożeniu projektu na produkcję! 🚀**