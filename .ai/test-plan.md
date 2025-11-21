# Plan Testów - Rental Utilities Billing System

## 1. Wprowadzenie i Cele Testowania

### 1.1 Cel dokumentu
Niniejszy dokument definiuje kompleksową strategię testowania systemu rozliczania mediów dla nieruchomości wynajmowanych (Rental Utilities Billing System). Plan opisuje zakres, metodologię, narzędzia oraz harmonogram testów w celu zapewnienia wysokiej jakości aplikacji MVP.

### 1.2 Cele testowania
- **Poprawność biznesowa**: Weryfikacja zgodności kalkulacji finansowych z wymogami PRD (FR-011)
- **Bezpieczeństwo danych**: Walidacja RLS policies i kontroli dostępu (FR-002)
- **Integralność danych**: Zapewnienie spójności danych między powiązanymi encjami
- **Niezawodność**: Weryfikacja obsługi błędów i warunków brzegowych
- **Wydajność**: Sprawdzenie czasów odpowiedzi API i renderowania UI
- **Użyteczność**: Weryfikacja UX i dostępności (a11y)
- **Zgodność z PRD**: Pokrycie wszystkich wymagań funkcjonalnych i niefunkcjonalnych

### 1.3 Zakres projektu
System rozlicza media (woda zimna, woda ciepła, ogrzewanie) dla pojedynczej nieruchomości z jednym aktywnym najemcą. Obejmuje:
- Uwierzytelnianie użytkowników (tenant/admin)
- Zarządzanie odczytami liczników z systemem anchoring
- Miesięczne rozliczenia z precyzyjnymi zaokrągleniami
- Generowanie i wysyłanie raportów email
- Audyt zmian i log aktywności

## 2. Zakres Testów

### 2.1 Testy w zakresie
- ✅ Testy jednostkowe serwisów (Services)
- ✅ Testy jednostkowe komponentów React
- ✅ Testy integracyjne endpointów API
- ✅ Testy integracyjne bazy danych (migrations, RLS)
- ✅ Testy E2E krytycznych ścieżek użytkownika
- ✅ Testy walidacji danych (Zod schemas)
- ✅ Testy kalkulacji finansowych
- ✅ Testy autoryzacji i autentykacji
- ✅ Testy accessibility (a11y)
- ✅ Testy wydajnościowe API

### 2.2 Testy poza zakresem MVP
- ❌ Testy obciążeniowe (load testing)
- ❌ Testy bezpieczeństwa (penetration testing)
- ❌ Testy wizualne (visual regression)
- ❌ Testy lokalizacji (i18n) - tylko pl-PL w MVP
- ❌ Testy kompatybilności przeglądarek (tylko Chrome, Firefox, Safari)
- ❌ Testy mobilne (responsive design testowany manualnie)

## 3. Typy Testów

### 3.1 Testy Jednostkowe (Unit Tests)

**Narzędzie**: Vitest + Testing Library  
**Środowisko**: Node.js (services), jsdom (components)  
**Pokrycie target**: ≥ 80% line coverage

#### 3.1.1 Testy Serwisów

**ReadingsService**
- ✅ Tworzenie odczytu tenant w oknie -3/+5 dni
- ✅ Blokada tworzenia odczytu tenant poza oknem
- ✅ Tworzenie replacement reading przez admina
- ✅ Aktualizacja baseForMonth/finalForMonth
- ✅ Soft delete odczytu
- ✅ Walidacja zakresu wartości (0-9,999,999.999)
- ✅ Walidacja precyzji (3 miejsca dziesiętne)
- ✅ Clearing conflicting assignments
- ✅ Finding reading pairs for property and month
- ⚠️ Race condition handling (low priority)

**ReportService**
- ✅ Generowanie raportu z pełnymi danymi
- ✅ Blokada generowania bez pary odczytów
- ✅ Blokada duplikatu (contract × month)
- ✅ Kalkulacja fixed_cost zgodnie z FR-011
- ✅ Kalkulacja meter costs z zaokrągleniem
- ✅ Kalkulacja actual_rent i balance
- ✅ Regeneracja raportu z nowymi danymi
- ✅ Recompute all reports po zmianach
- ✅ Recompute for reading po update
- ⚠️ Cascade deletes (integration test)

**ContractService**
- ✅ Listing contracts z filtrowaniem
- ✅ Scope dla tenant (tylko własne kontrakty)
- ✅ Walidacja overlapping periods
- ✅ Tworzenie kontraktu
- ✅ Aktualizacja kontraktu
- ✅ Usuwanie kontraktu

**MonthlyAdvanceService**
- ✅ CRUD operations
- ✅ Walidacja cen i prognoz
- ✅ Versioning po miesiącach
- ✅ Warning przy forecast = 0

**PropertyService**
- ✅ CRUD operations
- ✅ Walidacja start_month (first day)
- ✅ Listing z RLS

**ProfileService**
- ✅ Listing profiles (admin only)
- ✅ Update profile
- ✅ Role validation

#### 3.1.2 Testy Komponentów React

**ReadingForm**
- ✅ Renderowanie formularza
- ✅ Walidacja input fields (3 decimal places)
- ✅ Clamping precision on blur
- ✅ Disable outside submission window
- ✅ Display window message
- ✅ Submit success/error handling
- ✅ Toast notifications

**AdminReadingsView**
- ✅ Wyświetlanie listy odczytów
- ✅ Filtrowanie po dacie
- ✅ Sortowanie
- ✅ Navigacja do formularza
- ✅ Delete confirmation modal

**TenantReadingsHistory**
- ✅ Wyświetlanie historii odczytów
- ✅ Pagination
- ✅ Empty state

**AdminReportsTable**
- ✅ Wyświetlanie listy raportów
- ✅ Filtrowanie po statusie
- ✅ Sent toggle
- ✅ Navigacja do szczegółów

**AdminReportDetail**
- ✅ Wyświetlanie szczegółów raportu
- ✅ Report items z zaokrąglonymi wartościami
- ✅ Email details
- ✅ Regenerate button
- ✅ Send email button
- ✅ Error handling

**MonthlyAdvancesTable**
- ✅ Wyświetlanie warunków miesięcznych
- ✅ Inline editing
- ✅ Validation errors
- ✅ Warning przy forecast = 0

**AdminContractsList**
- ✅ Wyświetlanie listy kontraktów
- ✅ Active/inactive filter
- ✅ Create contract modal
- ✅ Edit contract
- ✅ Delete confirmation

**AdminPropertiesList**
- ✅ Wyświetlanie listy nieruchomości
- ✅ Create property modal
- ✅ Edit property
- ✅ Delete confirmation

**ProfileForm**
- ✅ Wyświetlanie i edycja profilu
- ✅ Display name update
- ✅ Role display (read-only)

**LoginForm**
- ✅ Email input validation
- ✅ Magic link request
- ✅ Success message
- ✅ Error handling

### 3.2 Testy Integracyjne (Integration Tests)

**Narzędzie**: Vitest + Supabase Test Client  
**Środowisko**: Test database (migrations applied)

#### 3.2.1 Testy Endpointów API

**GET /v1/me**
- ✅ Zwraca dane zalogowanego użytkownika
- ✅ 401 gdy brak tokenu
- ✅ 401 gdy token nieprawidłowy

**POST /v1/auth/sign-in**
- ✅ Wysyła magic link
- ✅ 400 przy nieprawidłowym email
- ✅ Rate limiting

**GET /v1/properties**
- ✅ Admin widzi wszystkie properties
- ✅ Tenant widzi tylko swoją property
- ✅ 401 gdy unauthorized

**POST /v1/properties**
- ✅ Admin może tworzyć property
- ✅ 403 gdy tenant próbuje
- ✅ 400 przy nieprawidłowych danych

**GET /v1/contracts**
- ✅ Admin widzi wszystkie kontrakty
- ✅ Tenant widzi tylko swoje
- ✅ Filtrowanie po active
- ✅ Filtrowanie po propertyId

**POST /v1/contracts**
- ✅ Admin może tworzyć kontrakt
- ✅ 400 przy overlapping period
- ✅ 403 gdy tenant próbuje

**GET /v1/readings**
- ✅ Listing z filtrowaniem po propertyId
- ✅ Filtrowanie po zakresie dat
- ✅ Tenant scope do własnej property
- ✅ Sortowanie po reading_at DESC

**POST /v1/readings**
- ✅ Tenant może dodać odczyt w oknie
- ✅ 400 poza oknem dla tenant
- ✅ Admin może dodać zawsze
- ✅ Walidacja zakresu i precyzji
- ✅ Auto-clearing conflicting assignments

**PATCH /v1/readings/:id**
- ✅ Aktualizacja odczytu
- ✅ 403 gdy tenant próbuje edytować admin reading
- ✅ Auto-recompute affected reports

**DELETE /v1/readings/:id**
- ✅ Soft delete (deleted_at)
- ✅ 404 gdy już usunięty
- ✅ Auto-recompute affected reports

**POST /v1/readings/:id/replacement**
- ✅ Admin tworzy replacement
- ✅ 403 dla tenant
- ✅ 409 przy duplicate replacement
- ✅ Validation effectiveMonth

**PATCH /v1/readings/:id/months**
- ✅ Admin aktualizuje baseForMonth/finalForMonth
- ✅ 403 dla tenant
- ✅ Auto-clearing conflicts
- ✅ Auto-recompute reports

**GET /v1/monthly-advances**
- ✅ Listing warunków miesięcznych
- ✅ Filtrowanie po propertyId
- ✅ Tenant scope

**POST /v1/monthly-advances**
- ✅ Admin może tworzyć
- ✅ 403 dla tenant
- ✅ Walidacja cen (≥ 0, 4 decimals)
- ✅ Walidacja forecast (≥ 0, 3 decimals)
- ✅ Month jako pierwszy dzień

**PATCH /v1/monthly-advances/:id**
- ✅ Aktualizacja warunków
- ✅ Auto-recompute affected reports

**POST /v1/reports/generate**
- ✅ Generowanie raportu dla contract × month
- ✅ 400 gdy brak reading pair
- ✅ 409 przy duplicate
- ✅ Kalkulacje zgodnie z FR-011
- ✅ Tworzenie report_items

**POST /v1/reports/:id/regenerate**
- ✅ Regeneracja istniejącego raportu
- ✅ Update report_items
- ✅ 404 gdy raport nie istnieje
- ✅ Auto-delete gdy brak pair

**GET /v1/reports**
- ✅ Listing raportów
- ✅ Tenant scope do własnych
- ✅ Filtrowanie po month, status

**GET /v1/reports/:id**
- ✅ Szczegóły raportu
- ✅ 404 gdy nie istnieje
- ✅ 403 przy brak dostępu

**GET /v1/reports/:id/items**
- ✅ Pobieranie pozycji raportu
- ✅ Zaokrąglone wartości

**POST /v1/reports/:id/send-email**
- ✅ Wysłanie emaila
- ✅ Idempotency (10 min throttle)
- ✅ Deduplication recipients
- ✅ HTML snapshot storage
- ✅ Retry on transient errors

**PATCH /v1/reports/:id/sent**
- ✅ Aktualizacja statusu sent
- ✅ 404 gdy nie istnieje

**POST /v1/_tasks/run/:taskName**
- ✅ Enqueue task (day1Reminder, etc.)
- ✅ 401 bez service key
- ✅ 404 dla unknown task
- ✅ Rate limiting (5 req/min)

#### 3.2.2 Testy Bazy Danych

**Migrations**
- ✅ All migrations apply cleanly
- ✅ Rollback migrations (if applicable)
- ✅ Constraints enforcement
- ✅ Indexes exist

**RLS Policies**
- ✅ Tenant nie widzi innych properties
- ✅ Tenant nie widzi innych contracts
- ✅ Tenant nie widzi innych readings
- ✅ Tenant nie widzi innych reports
- ✅ Admin widzi wszystko
- ✅ Unauthorized user nie widzi nic

**Constraints**
- ✅ properties.start_month first of month
- ✅ contracts no overlap (exclude using gist)
- ✅ readings effectiveMonth only for replacements
- ✅ reports unique (contract_id, month)
- ✅ reports realized_at matches status
- ✅ monthly_advances month first of month

**Triggers & Functions**
- ✅ updated_at auto-update
- ✅ get_user_email function
- ✅ list_profiles function

### 3.3 Testy End-to-End (E2E)

**Narzędzie**: Playwright  
**Przeglądarki**: Chromium, Firefox, WebKit  
**Środowisko**: Staging/Preview

#### 3.3.1 Przepływy Tenant

**T-001: Logowanie i nawigacja**
- Wejście na stronę logowania
- Wprowadzenie email
- Request magic link
- Otwarcie linku (simulate)
- Weryfikacja przekierowania do dashboard
- Sprawdzenie elementów nawigacji

**T-002: Dodawanie odczytu w oknie**
- Logowanie jako tenant
- Nawigacja do formularza odczytu
- Sprawdzenie, czy formularz jest aktywny
- Wprowadzenie wartości (cold, hot, heating)
- Submit
- Weryfikacja toast success
- Sprawdzenie w historii

**T-003: Próba dodania odczytu poza oknem**
- Logowanie jako tenant
- Nawigacja do formularza odczytu
- Sprawdzenie, czy formularz jest zablokowany
- Weryfikacja komunikatu o oknie
- Brak możliwości submitu

**T-004: Przeglądanie historii odczytów**
- Logowanie jako tenant
- Nawigacja do historii odczytów
- Sprawdzenie listy odczytów
- Weryfikacja sortowania (latest first)
- Sprawdzenie formatowania wartości

**T-005: Przeglądanie własnych raportów**
- Logowanie jako tenant
- Nawigacja do raportów
- Sprawdzenie listy raportów
- Kliknięcie w raport
- Weryfikacja szczegółów raportu
- Sprawdzenie kalkulacji (rounded values)

**T-006: Próba dostępu do admin routes**
- Logowanie jako tenant
- Próba wejścia na /admin/properties
- Weryfikacja przekierowania lub 403

#### 3.3.2 Przepływy Admin

**A-001: Logowanie i dashboard**
- Wejście na stronę logowania
- Logowanie jako admin
- Weryfikacja przekierowania do admin dashboard
- Sprawdzenie elementów nawigacji

**A-002: Zarządzanie Properties**
- Logowanie jako admin
- Nawigacja do Properties
- Kliknięcie "Dodaj property"
- Wypełnienie formularza
- Submit
- Weryfikacja w liście
- Edycja property
- Usunięcie property

**A-003: Zarządzanie Contracts**
- Logowanie jako admin
- Nawigacja do Contracts
- Kliknięcie "Dodaj kontrakt"
- Wybór property i tenant
- Ustawienie period
- Submit
- Weryfikacja w liście
- Próba dodania overlapping contract (error)

**A-004: Zarządzanie Monthly Advances**
- Logowanie jako admin
- Nawigacja do Monthly Advances
- Kliknięcie "Dodaj warunki"
- Wypełnienie wszystkich pól
- Submit
- Weryfikacja w liście
- Edycja warunków
- Sprawdzenie auto-recompute reports

**A-005: Dodawanie odczytu tenant**
- Logowanie jako admin
- Nawigacja do Readings
- Dodanie odczytu regular (origin: tenant)
- Weryfikacja w liście
- Sprawdzenie anchoring indicators

**A-006: Tworzenie replacement reading**
- Logowanie jako admin
- Nawigacja do Readings
- Wybór odczytu do replacement
- Kliknięcie "Replace"
- Wypełnienie formularza
- Ustawienie effectiveMonth
- Submit
- Weryfikacja w liście (origin: admin_replacement)
- Sprawdzenie anchoring override

**A-007: Generowanie raportu**
- Logowanie jako admin
- Nawigacja do Reports
- Kliknięcie "Generuj raport"
- Wybór contract i month
- Submit
- Weryfikacja raportu w liście
- Sprawdzenie kalkulacji
- Weryfikacja report_items

**A-008: Regeneracja raportu**
- Logowanie jako admin
- Nawigacja do szczegółów raportu
- Kliknięcie "Regeneruj"
- Confirm
- Weryfikacja zaktualizowanych wartości
- Sprawdzenie updated_at

**A-009: Wysyłanie emaila z raportem**
- Logowanie jako admin
- Nawigacja do szczegółów raportu
- Kliknięcie "Wyślij email"
- Weryfikacja toast success
- Sprawdzenie statusu sent = true
- Próba ponownego wysłania przed 10 min (throttled)

**A-010: Aktualizacja baseForMonth/finalForMonth**
- Logowanie jako admin
- Nawigacja do Readings
- Wybór odczytu
- Kliknięcie "Edytuj miesiące"
- Ustawienie baseForMonth
- Submit
- Weryfikacja auto-recompute affected reports
- Sprawdzenie anchoring w UI

### 3.4 Testy Wydajnościowe (Performance Tests)

**Narzędzie**: Custom scripts + Playwright  
**Środowisko**: Staging

#### 3.4.1 API Response Times

**Kryteria akceptacji**:
- p50 < 200ms
- p95 < 500ms
- p99 < 1000ms

**Endpointy do testowania**:
- GET /v1/readings?propertyId=X (50 readings)
- GET /v1/reports?propertyId=X (50 reports)
- POST /v1/reports/generate (with pair and conditions)
- POST /v1/reports/:id/regenerate
- GET /v1/monthly-advances?propertyId=X

#### 3.4.2 UI Rendering Performance

**Kryteria akceptacji**:
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.0s

**Strony do testowania**:
- /admin/readings
- /admin/reports
- /app/readings

### 3.5 Testy Accessibility (a11y)

**Narzędzie**: axe-core + Playwright  
**Standard**: WCAG 2.1 Level AA

#### 3.5.1 Krytyczne Strony

- ✅ Login page
- ✅ Tenant readings form
- ✅ Tenant reports list
- ✅ Admin readings view
- ✅ Admin reports table
- ✅ Admin properties list
- ✅ Admin contracts list
- ✅ Admin monthly advances table

#### 3.5.2 Sprawdzane Elementy

- Semantic HTML (h1-h6, nav, main, etc.)
- Form labels i aria-labels
- Keyboard navigation (tab order)
- Focus indicators
- Alt text dla images
- Contrast ratios
- Screen reader compatibility

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1 Kalkulacje Finansowe (FR-011)

**TC-CALC-001: Kalkulacja cold water cost**
- **Dane wejściowe**: 
  - consumption_cold = 10.123 m³
  - price_cold = 12.3456 PLN/m³
- **Oczekiwany wynik**: 
  - cost_cold_raw = 124.906799
  - cost_cold (rounded) = 124.91 PLN
- **Walidacja**: Zaokrąglenie half-up do 2 miejsc

**TC-CALC-002: Kalkulacja hot water cost**
- **Dane wejściowe**: 
  - consumption_hot = 5.456 m³
  - price_cold = 12.3456 PLN/m³
  - price_hot_heating = 45.6789 PLN/m³
  - hot_water_unit_price = 58.0245 PLN/m³
- **Oczekiwany wynik**: 
  - cost_hot_raw = 316.581752
  - cost_hot (rounded) = 316.58 PLN
- **Walidacja**: Użycie sumy price_cold + price_hot_heating

**TC-CALC-003: Kalkulacja heating cost**
- **Dane wejściowe**: 
  - consumption_heating = 2.789 GJ
  - price_heating = 85.1234 PLN/GJ
- **Oczekiwany wynik**: 
  - cost_heating_raw = 237.449163
  - cost_heating (rounded) = 237.45 PLN
- **Walidacja**: Zaokrąglenie half-up do 2 miejsc

**TC-CALC-004: Kalkulacja fixed cost**
- **Dane wejściowe**: 
  - manager_fee = 1500.00 PLN
  - forecast_cold = 8.000 m³ × 12.3456 PLN/m³ = 98.7648 PLN
  - forecast_hot = 4.000 m³ × 58.0245 PLN/m³ = 232.098 PLN
  - forecast_heating = 2.000 GJ × 85.1234 PLN/GJ = 170.2468 PLN
  - forecast_total = 501.1096 PLN
- **Oczekiwany wynik**: 
  - fixed_cost_raw = 998.8904 PLN
  - fixed_cost (rounded) = 998.89 PLN
- **Walidacja**: manager_fee - forecast_total

**TC-CALC-005: Kalkulacja actual rent i balance**
- **Dane wejściowe** (z powyższych testów):
  - fixed_cost = 998.89 PLN
  - cost_cold = 124.91 PLN
  - cost_hot = 316.58 PLN
  - cost_heating = 237.45 PLN
  - advance_payment = 1600.00 PLN
- **Oczekiwany wynik**: 
  - actual_rent = 1677.83 PLN
  - balance = -77.83 PLN (niedopłata)
- **Walidacja**: balance = advance_payment - actual_rent

**TC-CALC-006: Edge case - zero consumption**
- **Dane wejściowe**: 
  - wszystkie consumption = 0
  - advance_payment = 1500.00 PLN
- **Oczekiwany wynik**: 
  - actual_rent = fixed_cost
  - balance > 0 (nadpłata)
- **Walidacja**: Poprawna obsługa zero consumption

**TC-CALC-007: Edge case - negative consumption (meter replaced)**
- **Dane wejściowe**: 
  - final_reading < base_reading
  - replacement reading ustawiony
- **Oczekiwany wynik**: 
  - consumption = max(0, final - base) = 0 lub użycie replacement
- **Walidacja**: Brak ujemnych wartości

**TC-CALC-008: Precision rounding edge cases**
- **Test 1**: 124.905 → 124.91 (half-up)
- **Test 2**: 124.904 → 124.90 (half-down)
- **Test 3**: 124.915 → 124.92
- **Test 4**: 124.925 → 124.93 (half-up)
- **Walidacja**: Konsystentne zaokrąglenie half-up

### 4.2 Reading Anchoring System (FR-006)

**TC-ANCHOR-001: Odczyt w pierwszych 5 dniach miesiąca N**
- **Setup**: 
  - Month N = 2024-05
  - Reading 2024-05-03T10:00:00Z
- **Oczekiwany wynik**: 
  - Anchored as baseForMonth = "2024-05"
- **Walidacja**: Earliest reading days 1-5

**TC-ANCHOR-002: Odczyt w ostatnich 3 dniach miesiąca N-1**
- **Setup**: 
  - Month N = 2024-05
  - Reading 2024-04-29T10:00:00Z
- **Oczekiwany wynik**: 
  - Anchored as baseForMonth = "2024-05"
- **Walidacja**: Latest reading last 3 days

**TC-ANCHOR-003: Wybór między wieloma odczytami w oknie**
- **Setup**: 
  - Reading A: 2024-04-29T10:00:00Z
  - Reading B: 2024-05-02T10:00:00Z
  - Reading C: 2024-05-03T10:00:00Z
- **Oczekiwany wynik**: 
  - Anchored reading = Reading B (earliest in days 1-5)
- **Walidacja**: Priority: days 1-5 over last 3 days

**TC-ANCHOR-004: Admin replacement override**
- **Setup**: 
  - Tenant reading: 2024-05-03T10:00:00Z
  - Admin replacement: 2024-05-02T12:00:00Z, effectiveMonth = "2024-05"
- **Oczekiwany wynik**: 
  - Anchored reading = Admin replacement
- **Walidacja**: Replacement ma priorytet

**TC-ANCHOR-005: Brak odczytu w oknie**
- **Setup**: 
  - Month N = 2024-05
  - Brak readings w oknie -3/+5
- **Oczekiwany wynik**: 
  - baseForMonth = null
  - Report generation blocked
- **Walidacja**: Komunikat o brakującym odczycie

**TC-ANCHOR-006: Tenant submission window enforcement**
- **Test 1 (w oknie)**: 
  - Now = 2024-05-03T12:00:00Z
  - Tenant może dodać reading
- **Test 2 (poza oknem)**: 
  - Now = 2024-05-10T12:00:00Z
  - Tenant NIE MOŻE dodać reading
- **Test 3 (admin zawsze)**: 
  - Now = 2024-06-15T12:00:00Z
  - Admin MOŻE dodać reading
- **Walidacja**: isWithinTenantWindow() function

### 4.3 Autoryzacja i RLS (FR-002)

**TC-AUTH-001: Tenant nie widzi innych properties**
- **Setup**: 
  - Tenant A (propertyId: prop-1)
  - Property prop-2 istnieje
- **Test**: GET /v1/readings?propertyId=prop-2
- **Oczekiwany wynik**: 
  - 403 Forbidden lub 0 results
- **Walidacja**: RLS policy enforcement

**TC-AUTH-002: Tenant nie może edytować admin replacement**
- **Setup**: 
  - Reading created by admin (origin: admin_replacement)
  - Tenant próbuje PATCH /v1/readings/:id
- **Oczekiwany wynik**: 
  - 403 Forbidden z kodem READING_FORBIDDEN
- **Walidacja**: Service-level check

**TC-AUTH-003: Admin widzi wszystkie properties**
- **Setup**: 
  - Admin user
  - Multiple properties exist
- **Test**: GET /v1/properties
- **Oczekiwany wynik**: 
  - All properties returned
- **Walidacja**: No RLS filtering dla admin

**TC-AUTH-004: Unauthorized access do protected routes**
- **Test**: GET /admin/readings (bez tokenu)
- **Oczekiwany wynik**: 
  - 302 Redirect to /auth/login
- **Walidacja**: Middleware isProtectedRoute()

**TC-AUTH-005: Expired token rejection**
- **Setup**: 
  - Token wygasł (>30 days)
- **Test**: GET /v1/me
- **Oczekiwany wynik**: 
  - 401 Unauthorized
- **Walidacja**: Supabase session validation

**TC-AUTH-006: Tenant nie może tworzyć properties**
- **Test**: POST /v1/properties (jako tenant)
- **Oczekiwany wynik**: 
  - 403 Forbidden
- **Walidacja**: requireAdmin guard

**TC-AUTH-007: Service role key authentication**
- **Test 1 (brak klucza)**: POST /v1/_tasks/run/day1Reminder
- **Oczekiwany wynik**: 401 Unauthorized
- **Test 2 (nieprawidłowy klucz)**: header = "wrong-key"
- **Oczekiwany wynik**: 401 Unauthorized
- **Test 3 (prawidłowy klucz)**: header = env.SERVICE_ROLE_KEY
- **Oczekiwany wynik**: 202 Accepted
- **Walidacja**: Timing-safe comparison

### 4.4 Report Generation (FR-012)

**TC-REPORT-001: Generowanie z pełnymi danymi**
- **Setup**: 
  - Contract exists
  - Reading pair (base and final) dla month N
  - Monthly advances dla month N
- **Test**: POST /v1/reports/generate
- **Oczekiwany wynik**: 
  - Report created z statusem "draft"
  - Report_items created
  - Kalkulacje zgodne z FR-011
- **Walidacja**: End-to-end flow

**TC-REPORT-002: Blokada przy brakującym base reading**
- **Setup**: 
  - Brak base reading dla month N
  - Final reading istnieje
- **Test**: POST /v1/reports/generate
- **Oczekiwany wynik**: 
  - 400 Bad Request
  - Kod: MISSING_READING_PAIR
- **Walidacja**: Walidacja prerequisites

**TC-REPORT-003: Blokada przy brakującym final reading**
- **Setup**: 
  - Base reading istnieje
  - Brak final reading
- **Test**: POST /v1/reports/generate
- **Oczekiwany wynik**: 
  - 400 Bad Request
  - Kod: MISSING_READING_PAIR
- **Walidacja**: Pair completeness check

**TC-REPORT-004: Blokada przy brakujących monthly advances**
- **Setup**: 
  - Reading pair istnieje
  - Brak monthly_advances dla month N
- **Test**: POST /v1/reports/generate
- **Oczekiwany wynik**: 
  - 400 Bad Request
  - Kod: MISSING_MONTHLY_CONDITIONS
- **Walidacja**: Monthly advances required

**TC-REPORT-005: Blokada duplikatu (contract × month)**
- **Setup**: 
  - Report już istnieje dla contract-1 × 2024-05
- **Test**: POST /v1/reports/generate (ten sam contract × month)
- **Oczekiwany wynik**: 
  - 409 Conflict
  - Kod: REPORT_DUPLICATE
- **Walidacja**: Unique constraint

**TC-REPORT-006: Regeneracja raportu**
- **Setup**: 
  - Report exists
  - Readings lub monthly_advances changed
- **Test**: POST /v1/reports/:id/regenerate
- **Oczekiwany wynik**: 
  - Report_items updated z nowymi kalkulacjami
  - updated_at changed
- **Walidacja**: Recomputation logic

**TC-REPORT-007: Auto-recompute po update reading**
- **Setup**: 
  - Report istnieje dla month N
  - Reading updated (base or final for month N)
- **Test**: PATCH /v1/readings/:id
- **Oczekiwany wynik**: 
  - Report auto-regenerated
  - Report_items updated
- **Walidacja**: Cascade recompute

**TC-REPORT-008: Auto-recompute po update monthly advances**
- **Setup**: 
  - Report istnieje dla month N
  - Monthly_advances updated dla month N
- **Test**: PATCH /v1/monthly-advances/:id
- **Oczekiwany wynik**: 
  - All affected reports regenerated
- **Walidacja**: Cascade recompute

### 4.5 Email Delivery z Idempotency (FR-014, FR-015)

**TC-EMAIL-001: Wysyłka do tenant i admin**
- **Setup**: 
  - Tenant email: tenant@example.com
  - Admin email: admin@example.com
- **Test**: POST /v1/reports/:id/send-email
- **Oczekiwany wynik**: 
  - 2 emaile wysłane (tenant + admin)
  - HTML snapshots stored
  - sent = true
- **Walidacja**: Recipients deduplication

**TC-EMAIL-002: Deduplication gdy tenant = admin email**
- **Setup**: 
  - Tenant email: user@example.com
  - Admin email: user@example.com
- **Test**: POST /v1/reports/:id/send-email
- **Oczekiwany wynik**: 
  - 1 email wysłany
  - Deduplicated by email address
- **Walidacja**: No duplicate sends

**TC-EMAIL-003: Throttling (10 min)**
- **Setup**: 
  - Email sent at T=0
- **Test 1**: Resend at T=5min
- **Oczekiwany wynik**: 429 Rate Limited lub skip
- **Test 2**: Resend at T=11min
- **Oczekiwany wynik**: 200 OK, email sent
- **Walidacja**: lastSentAt enforcement

**TC-EMAIL-004: Idempotency key (reportId, recipient)**
- **Setup**: 
  - Email sent to tenant@example.com dla report-1
- **Test**: Retry send (same report, same recipient)
- **Oczekiwany wynik**: 
  - Skip if < 10 min
  - Resend if ≥ 10 min
- **Walidacja**: Idempotency logic

**TC-EMAIL-005: Retry on transient errors**
- **Setup**: 
  - Email send fails (transient SMTP error)
- **Oczekiwany wynik**: 
  - Retry after 5 min
  - Retry after 1 hour
  - Retry after 24 hours
  - Max 3 retries
- **Walidacja**: Retry policy

**TC-EMAIL-006: HTML snapshot storage**
- **Setup**: 
  - Email sent successfully
- **Oczekiwany wynik**: 
  - HTML content stored in report_emails
  - snapshot_html not null
- **Walidacja**: Audit trail

## 5. Środowisko Testowe

### 5.1 Środowiska

**Development (Local)**
- **Purpose**: Developer testing, unit tests
- **URL**: http://localhost:4321
- **Database**: Local Supabase instance lub Docker
- **Email**: Preview mode (no actual sends)
- **Auth**: Supabase local auth

**Staging (CI/CD)**
- **Purpose**: Integration tests, E2E tests
- **URL**: https://staging.rental-billing.app (lub DigitalOcean preview)
- **Database**: Supabase staging project
- **Email**: Test SMTP server (Mailhog lub podobny)
- **Auth**: Supabase staging auth

**Production**
- **Purpose**: Manual smoke tests, monitoring
- **URL**: https://rental-billing.app (lub DigitalOcean production)
- **Database**: Supabase production project
- **Email**: Gmail SMTP (credentials w env vars)
- **Auth**: Supabase production auth

### 5.2 Dane Testowe

**Test Users**
- Tenant 1: tenant1@test.com (propertyId: test-prop-1)
- Tenant 2: tenant2@test.com (propertyId: test-prop-2)
- Admin: admin@test.com (full access)

**Test Properties**
- Property 1: "Test Apartment 1" (start_month: 2024-01-01)
- Property 2: "Test Apartment 2" (start_month: 2024-03-01)

**Test Contracts**
- Contract 1: Tenant 1 @ Property 1 (2024-01-01 → 2024-12-31)
- Contract 2: Tenant 2 @ Property 2 (2024-03-01 → 2025-02-28)

**Test Readings**
- Property 1: Monthly readings (2024-01 → current)
- Property 2: Monthly readings (2024-03 → current)

**Test Monthly Advances**
- Property 1: Monthly conditions (2024-01 → current)
- Property 2: Monthly conditions (2024-03 → current)

**Test Reports**
- Property 1: 3-5 raportów (różne statusy)
- Property 2: 2-3 raporty

### 5.3 Konfiguracja Testów

**Vitest (vitest.config.ts)**
```typescript
{
  environment: "node" (services),
  setupFiles: ["./vitest.setup.ts"],
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html", "lcov"],
    threshold: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  }
}
```

**Playwright (playwright.config.ts)**
```typescript
{
  testDir: "./e2e",
  retries: 2 (na CI),
  workers: 1 (na CI),
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: ["chromium", "firefox", "webkit"]
}
```

## 6. Narzędzia do Testowania

### 6.1 Narzędzia Podstawowe

| Narzędzie | Wersja | Cel | Zastosowanie |
|-----------|--------|-----|--------------|
| **Vitest** | ^2.1.4 | Unit & integration tests | Services, utils, validators |
| **Testing Library** | ^16.2.0 | React component tests | UI components |
| **Playwright** | ^1.49.1 | E2E tests | User flows, critical paths |
| **@vitest/coverage-v8** | ^2.1.4 | Code coverage | Coverage reports |
| **jsdom** | ^25.0.1 | DOM emulation | Component testing |

### 6.2 Narzędzia Wspomagające

| Narzędzie | Zastosowanie |
|-----------|--------------|
| **ESLint** | Linting, code quality |
| **Prettier** | Code formatting |
| **TypeScript** | Type checking |
| **Zod** | Runtime validation |
| **axe-core** | Accessibility testing |
| **Lighthouse** | Performance audit |

### 6.3 Infrastruktura CI/CD

**GitHub Actions** (`.github/workflows/pull-request.yml`)
- **Triggers**: Pull request, push to main
- **Jobs**:
  1. **Lint**: ESLint + Prettier check
  2. **Type Check**: TypeScript tsc --noEmit
  3. **Unit Tests**: Vitest run
  4. **Integration Tests**: Vitest run (with DB)
  5. **E2E Tests**: Playwright test
  6. **Coverage**: Upload to Codecov
  7. **Build**: Astro build

**Deployment Pipeline**
1. PR created → GitHub Actions run
2. Tests pass → Deploy to Staging
3. Manual QA on Staging
4. Merge to main → Deploy to Production

## 7. Harmonogram Testów

### 7.1 Faza 1: Setup i Unit Tests (Tydzień 1-2)

**Tydzień 1**
- [x] Konfiguracja Vitest
- [x] Konfiguracja Testing Library
- [ ] Napisanie testów serwisów (ReadingsService, ReportService)
- [ ] Napisanie testów validators (Zod schemas)
- [ ] Code coverage ≥ 70%

**Tydzień 2**
- [ ] Testy komponentów React (ReadingForm, AdminReadingsView)
- [ ] Testy pozostałych serwisów (ContractService, etc.)
- [ ] Code coverage ≥ 80%
- [ ] Fix failing tests

### 7.2 Faza 2: Integration Tests (Tydzień 3-4)

**Tydzień 3**
- [ ] Setup test database
- [ ] Testy endpointów API (auth, readings, properties)
- [ ] Testy RLS policies
- [ ] Testy constraints

**Tydzień 4**
- [ ] Testy endpointów API (reports, monthly-advances)
- [ ] Testy email delivery (with mock SMTP)
- [ ] Testy tasks/scheduler
- [ ] Fix integration issues

### 7.3 Faza 3: E2E Tests (Tydzień 5-6)

**Tydzień 5**
- [ ] Konfiguracja Playwright
- [ ] Przepływy Tenant (T-001 do T-006)
- [ ] Przepływy Admin (A-001 do A-005)

**Tydzień 6**
- [ ] Przepływy Admin (A-006 do A-010)
- [ ] Testy wydajnościowe (API response times)
- [ ] Testy accessibility (axe-core)
- [ ] Cross-browser testing

### 7.4 Faza 4: Regression & Optimization (Tydzień 7)

**Tydzień 7**
- [ ] Regression testing na Staging
- [ ] Performance tuning
- [ ] Fix flaky tests
- [ ] Dokumentacja wyników
- [ ] Smoke tests na Production

### 7.5 Harmonogram Ciągły (Post-MVP)

**Co Sprint (2 tygodnie)**
- Nowe feature → nowe testy
- Regression testing
- Code coverage review
- Performance monitoring

**Co Miesiąc**
- E2E test suite run na Production
- Accessibility audit
- Security scan (npm audit)

## 8. Kryteria Akceptacji Testów

### 8.1 Kryteria Przejścia (Pass Criteria)

**Unit Tests**
- ✅ Code coverage ≥ 80% lines
- ✅ Code coverage ≥ 80% functions
- ✅ Code coverage ≥ 75% branches
- ✅ Wszystkie testy przechodzą
- ✅ Brak flaky tests (≥ 95% success rate)

**Integration Tests**
- ✅ Wszystkie endpointy API zwracają prawidłowe statusy
- ✅ RLS policies enforcement verified
- ✅ Database constraints tested
- ✅ Email idempotency working

**E2E Tests**
- ✅ Krytyczne przepływy Tenant działają
- ✅ Krytyczne przepływy Admin działają
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)
- ✅ No console errors w przeglądarce

**Performance**
- ✅ API p95 response time < 500ms
- ✅ Page load time < 3s (LCP)
- ✅ No memory leaks

**Accessibility**
- ✅ axe-core 0 violations (critical)
- ✅ Keyboard navigation works
- ✅ Screen reader compatible

### 8.2 Kryteria Blokujące (Blocking Criteria)

**Blokada Release jeśli**:
- ❌ Code coverage < 70%
- ❌ Critical bugs w E2E flows
- ❌ RLS bypass possible
- ❌ Kalkulacje finansowe nieprawidłowe (FR-011)
- ❌ Email delivery nie działa
- ❌ API response time > 1s (p95)
- ❌ Critical accessibility violations

### 8.3 Metryki Jakości

**Docelowe Metryki**:
- **Test Pass Rate**: ≥ 95%
- **Code Coverage**: ≥ 80%
- **Bug Escape Rate**: < 5% (bugs w Production)
- **Mean Time to Detection (MTTD)**: < 24h
- **Mean Time to Resolution (MTTR)**: < 48h

**Tracking**:
- Daily: CI/CD pipeline status
- Weekly: Test coverage report
- Monthly: Bug escape analysis

## 9. Role i Odpowiedzialności w Procesie Testowania

### 9.1 Role

**QA Engineer (Lead)**
- Tworzenie i utrzymanie strategii testów
- Przegląd i approve test plans
- Prowadzenie testów eksploracyjnych
- Koordynacja z Development Team
- Raportowanie metryk jakości

**Backend Developer**
- Pisanie testów jednostkowych serwisów
- Pisanie testów integracyjnych API
- Utrzymanie test fixtures i mocks
- Code review testów backend

**Frontend Developer**
- Pisanie testów komponentów React
- Pisanie testów E2E (Playwright)
- Utrzymanie test utilities (render, etc.)
- Code review testów frontend

**DevOps Engineer**
- Konfiguracja CI/CD pipelines
- Utrzymanie test environments (Staging)
- Monitoring test execution times
- Infrastructure as Code dla testów

**Product Owner**
- Definiowanie kryteriów akceptacji
- Priorytetyzacja scenariuszy testowych
- Approve release based on test results
- Feedback na test coverage

### 9.2 Workflow

**Development Flow**:
1. Developer pisze kod + testy jednostkowe
2. Developer pushuje PR
3. GitHub Actions run (lint, test, build)
4. Code review (w tym review testów)
5. Merge do main → deploy to Staging
6. QA Engineer: regression testing
7. Approve → deploy to Production
8. QA Engineer: smoke testing

**Bug Flow**:
1. Bug zgłoszony (GitHub Issue)
2. QA Engineer: reproduce + test case
3. Developer: fix + test
4. QA Engineer: verify fix
5. Regression test suite run
6. Close issue

## 10. Procedury Raportowania Błędów

### 10.1 Szablon Zgłoszenia Błędu (GitHub Issue)

```markdown
## Opis błędu
[Krótki opis problemu]

## Kroki reprodukcji
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## Oczekiwane zachowanie
[Co powinno się stać]

## Rzeczywiste zachowanie
[Co się stało]

## Środowisko
- Środowisko: [Development/Staging/Production]
- Przeglądarka: [Chrome 120 / Firefox 121 / Safari 17]
- OS: [macOS 14 / Windows 11 / Linux]
- User role: [Tenant / Admin]

## Logi/Zrzuty ekranu
[Załącz logi konsoli, network tab, screenshots]

## Severity
- [ ] Critical (блокujący funkcjonalność)
- [ ] High (ważna funkcjonalność nie działa)
- [ ] Medium (funkcjonalność działa z ograniczeniami)
- [ ] Low (kosmetyczny, edge case)

## Priority
- [ ] P0 (natychmiastowe działanie)
- [ ] P1 (w bieżącym sprincie)
- [ ] P2 (w następnym sprincie)
- [ ] P3 (backlog)
```

### 10.2 Klasyfikacja Severity

**Critical (P0)**
- Brak możliwości logowania
- Nieprawidłowe kalkulacje finansowe
- RLS bypass (wyciek danych)
- Crash aplikacji
- **SLA**: Fix w ciągu 4h

**High (P1)**
- Kluczowa funkcjonalność nie działa (np. generowanie raportów)
- Email delivery nie działa
- Admin nie może dodać odczytów
- **SLA**: Fix w ciągu 24h

**Medium (P2)**
- Funkcjonalność działa z ograniczeniami
- UI glitches
- Performance degradation
- **SLA**: Fix w ciągu 1 tygodnia

**Low (P3)**
- Kosmetyczne problemy UI
- Edge cases
- Nice-to-have features
- **SLA**: Backlog, priorytet według PO

### 10.3 Bug Triage Meeting

**Częstotliwość**: Codziennie (15 min standup)  
**Uczestnicy**: QA Lead, Dev Lead, PO

**Agenda**:
1. Przegląd nowych bugs (triage)
2. Status krytycznych bugs
3. Blocked bugs (czekające na info/fix)
4. Verified bugs (gotowe do close)

### 10.4 Bug Tracking

**Narzędzie**: GitHub Issues + Projects  
**Labels**:
- `bug` - potwierdzone błędy
- `severity:critical` / `severity:high` / etc.
- `priority:p0` / `priority:p1` / etc.
- `area:frontend` / `area:backend` / `area:database`
- `in-progress` / `blocked` / `ready-for-test`

**Workflow States**:
1. **New** → Bug zgłoszony
2. **Confirmed** → Reproduced przez QA
3. **In Progress** → Developer pracuje
4. **Ready for Test** → Fix deployed to Staging
5. **Verified** → QA potwierdza fix
6. **Closed** → Merged to Production

## 11. Załączniki

### 11.1 Przydatne Linki

- **PRD**: `/docs/prd.md`
- **Project Description**: `/docs/project_description.md`
- **Database Schema**: `/supabase/migrations/`
- **API Endpoints**: `/src/pages/api/v1/`
- **Components**: `/src/components/`
- **Services**: `/src/lib/services/`

### 11.2 Kontakt

- **QA Lead**: [Imię Nazwisko] - qa-lead@company.com
- **Dev Lead**: [Imię Nazwisko] - dev-lead@company.com
- **Product Owner**: [Imię Nazwisko] - po@company.com

### 11.3 Historia Zmian

| Wersja | Data | Autor | Zmiany |
|--------|------|-------|--------|
| 1.0 | 2024-11-16 | AI Assistant | Utworzenie dokumentu |

---

**Uwaga**: Niniejszy dokument jest żywym dokumentem i będzie aktualizowany w miarę postępu projektu i odkrywania nowych wymagań testowych.

