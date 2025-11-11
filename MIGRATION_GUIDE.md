# Migration Guide: From Anchors to baseForMonth/finalForMonth

## Przegląd zmian

System został zrefaktoryzowany z logiki opartej na "kotwicach" (anchors) na bezpośrednie przypisywanie miesięcy do odczytów poprzez pola `baseForMonth` i `finalForMonth`.

### Główne zmiany

1. **Odczyty (readings)**:
   - Dodano `base_for_month` (DATE) - miesiąc dla którego odczyt jest bazowy
   - Dodano `final_for_month` (DATE) - miesiąc dla którego odczyt jest finalny
   - Unikalność: max 1 bazowy i 1 finalny per (property, month)

2. **Raporty (reports)**:
   - Usunięto `anchor_reading_id`, `anchor_reading_next_id`, `monthly_conditions_id`
   - Usunięto kolumny z kosztami (przeniesione do `report_items`)
   - Dodano `sent` (BOOLEAN) - czy raport został wysłany

3. **Nowa tabela: report_items**:
   - Przechowuje pozycje raportu (jedna pozycja = jeden licznik/property)
   - Zawiera: `baseline_reading_id`, `final_reading_id`, zużycia, koszty

4. **Usunięte**:
   - Endpoint `/api/v1/readings/recalculate-anchors`
   - Job `recalculateAnchors`
   - Komponent `AnchorRecalcPanel`

## Kroki migracji

### 1. Backup bazy danych

```bash
# Utwórz backup przed migracją
pg_dump -h localhost -U postgres -d rental_utilities > backup_before_migration.sql
```

### 2. Zastosuj migrację

```bash
# Jeśli używasz Supabase CLI
supabase db reset

# Lub zastosuj migrację ręcznie
psql -h localhost -U postgres -d rental_utilities -f supabase/migrations/20251111120000_refactor_to_base_final_months.sql
```

### 3. Wygeneruj nowe typy TypeScript

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

### 4. Migracja danych (jeśli masz istniejące dane)

Jeśli masz istniejące odczyty i raporty, musisz:

1. **Przepisać przypisania miesięcy**:
   - Dla każdego odczytu, który był używany jako "kotwica" dla miesiąca M:
     - Ustaw `base_for_month = M` jeśli był odczytem początkowym
     - Ustaw `final_for_month = M` jeśli był odczytem końcowym

2. **Przebudować raporty**:
   ```sql
   -- Usuń stare raporty (zostaną odtworzone automatycznie)
   DELETE FROM reports;
   ```

3. **Wygeneruj raporty na nowo** przez UI lub API

### 5. Aktualizacja kodu aplikacji

Wszystkie zmiany w kodzie zostały już zaimplementowane. Upewnij się, że:

- [ ] Zainstalowano zależności: `npm install`
- [ ] Kod kompiluje się bez błędów: `npm run build`
- [ ] Testy przechodzą: `npm test` (niektóre mogą wymagać aktualizacji)

## Nowe API Endpoints

### Zarządzanie miesiącami odczytu (admin only)

```http
PATCH /api/v1/readings/:id/months
Content-Type: application/json

{
  "baseForMonth": "2025-01",  // lub null aby wyczyścić
  "finalForMonth": "2025-02"  // lub null aby wyczyścić
}
```

### Pobieranie pozycji raportu

```http
GET /api/v1/reports/:id/items

Response:
{
  "items": [
    {
      "id": "uuid",
      "reportId": "uuid",
      "propertyId": "uuid",
      "baselineReadingId": "uuid",
      "finalReadingId": "uuid",
      "usageColdM3": 10.5,
      "usageHotM3": 5.2,
      "usageHeatingGj": 2.3,
      "costColdRaw": 52.50,
      "costHotRaw": 78.00,
      "costHeatingRaw": 115.00,
      "fixedCostRaw": 100.00,
      "amountRaw": 345.50
    }
  ]
}
```

### Oznaczanie raportu jako wysłany (admin only)

```http
PATCH /api/v1/reports/:id/sent
Content-Type: application/json

{
  "sent": true
}
```

## Nowe komponenty UI

### ReadingMonthsForm
Formularz do przypisywania miesięcy do odczytu (admin only).

```tsx
import { ReadingMonthsForm } from "@/components/readings/ReadingMonthsForm";

<ReadingMonthsForm 
  reading={reading} 
  onSuccess={(updated) => console.log(updated)} 
/>
```

### ReportItemsView
Wyświetla pozycje raportu z podsumowaniem.

```tsx
import { ReportItemsView } from "@/components/reports/ReportItemsView";

<ReportItemsView reportId={reportId} />
```

### ReportSentToggle
Przełącznik do oznaczania raportu jako wysłany (admin only).

```tsx
import { ReportSentToggle } from "@/components/reports/ReportSentToggle";

<ReportSentToggle 
  report={report} 
  onSuccess={(updated) => console.log(updated)} 
/>
```

## Workflow po migracji

### Dla administratora

1. **Dodaj odczyty** (jak wcześniej)
2. **Przypisz miesiące** (nowe):
   - Otwórz widok odczytu
   - Użyj `ReadingMonthsForm` aby ustawić `baseForMonth` i/lub `finalForMonth`
3. **Generuj raporty** (jak wcześniej):
   - System automatycznie znajdzie pary odczytów (base + final) dla danego miesiąca
4. **Oznacz jako wysłany** (nowe):
   - Po wysłaniu raportu mailem, użyj `ReportSentToggle` aby oznaczyć jako wysłany

### Automatyczne przeliczanie

Raporty są automatycznie przeliczane gdy:
- Zmienisz wartości odczytu (PATCH `/api/v1/readings/:id`)
- Zmienisz przypisania miesięcy (PATCH `/api/v1/readings/:id/months`)
- Usuniesz odczyt (DELETE `/api/v1/readings/:id`)

## Różnice w logice biznesowej

### Przed (kotwice)
- Odczyty były automatycznie "kotwiczone" do miesięcy na podstawie okna -3/+5 dni
- Admin mógł nadpisać kotwicę przez `admin_replacement` z `effective_month`
- Przeliczanie kotwic było asynchroniczne (job queue)

### Po (baseForMonth/finalForMonth)
- Admin **jawnie** przypisuje miesiące do odczytów
- Brak automatycznego przypisywania (większa kontrola, mniej "magii")
- Przeliczanie raportów jest synchroniczne (natychmiastowe)
- Jeden odczyt może być bazowy dla miesiąca X i finalny dla X+1 (typowy przypadek)

## Rozwiązywanie problemów

### Raport nie generuje się

**Przyczyna**: Brak pary odczytów (base + final) dla danego miesiąca.

**Rozwiązanie**:
1. Sprawdź czy istnieją odczyty dla property
2. Upewnij się, że jeden odczyt ma `baseForMonth = M`
3. Upewnij się, że drugi odczyt ma `finalForMonth = M`

### Konflikt przy przypisywaniu miesiąca

**Przyczyna**: Już istnieje inny odczyt przypisany do tego samego (property, month).

**Rozwiązanie**:
1. Znajdź konfliktujący odczyt
2. Wyczyść jego przypisanie lub usuń go
3. Spróbuj ponownie

### Testy nie przechodzą

**Przyczyna**: Testy używają starej logiki kotwic.

**Rozwiązanie**:
1. Zaktualizuj testy aby używały nowych API endpoints
2. Zamockuj `base_for_month` i `final_for_month` zamiast kotwic
3. Uruchom testy ponownie

## Rollback

Jeśli musisz cofnąć migrację:

1. Przywróć backup bazy danych:
   ```bash
   psql -h localhost -U postgres -d rental_utilities < backup_before_migration.sql
   ```

2. Przywróć poprzednią wersję kodu:
   ```bash
   git revert <commit-hash>
   ```

## Kontakt

W razie problemów lub pytań, skontaktuj się z zespołem deweloperskim.

