You are an experienced product manager whose task is to help create a comprehensive Product Requirements Document (PRD) based on the provided information. Your goal is to generate a list of questions and recommendations that will be used in subsequent prompting to create a complete PRD.

Please carefully review the following information:

<project_description>
Mam mieszkanie na wynajem. Chciałbym stworzyć system wspomagający rozliczanie mediów w mieszkaniu. Aktualnie korzystam z arkusza kalkulacyjnego.
Zależy mi głównie na rozliczaniu zaliczek obecnych w czynszu (woda zimna, woda ciepła, CO - grzanie). 

Co miesiąc wykonuję następujące czynności i chciałbym je zautomatyzować lub przynajmniej zaktualizować część procesu.
1. Na początku miesiąca sprawdzam mail - najemca powinen wysłać zdjęcia liczników lub wartości odczytu.
2. Jeśli nie mam maila od najemcy, wysyłam mu przypomnienie o konieczności wykonania odczytów.
3. Gdy mam już odczyty od najemcy, przepisuję je do arkusza, gdzie mam stworzone formuły wyliczające realne zużycie najemcy za poprzedni miesiąc (bazuję na poprzednim odczycie <WARTOŚĆ BAZOWA> oraz odczycie z początku aktualnego miesiąca <WARTOŚĆ ODCZYTU>).
4. W arkuszu kalkulacyjnym mam stworzone formuły wyliczające realne zużycie mediów przez najemcę za poprzedni miesiąc. Wykorzystuję różnicę w odczytach oraz cenę za jednostkę ze Szczegółowego Czynszu. Otrzymuję kwotę jaką w rzeczywistości powinien zapłacić najemca za zużyte media.
5. Na podstawie kwot realnego zużycia wyliczam wysokość zwrotu lub niedopłaty. Wykorzystuję do tego następujące podejście:
	1. (wysokość czynszu pobieranego przez zarządcę) - (prognozowane zużycie mediów) = (koszt stałych elementów czynszu)
	2. (koszt stałych elementów czynszu) + (realny koszt zużycia mediów) = (realna wysokość czynszu)
	3. (zaliczka płacona mi przez najemcę) - (realna wysokość czynszu) = DOPŁATA lub NADPŁATA
6. Na tej podstawie robię przelew (tu automat mógłby mi przesyłać maila) lub informuję najemcę o konieczności wykonania dopłaty drogą mailową
7. Sprawdzam, czy aktualny czynsz na kolejny (aktualny) miesiąc się zmienił, aby zaktualizować arkusz kalkulacyjny na potrzeby wyliczeń, które będę wykonywał na początku następnego miesiąca). Wchodzę na portal e-kartoteka.pl i tam sprawdzam, czy pojawiła się jakaś zmiana w wysokości lub szczegółach czynszu. Szczegóły czynszu to dokument, w którym wypisane są wszystkie elementy stałe czynszu oraz elementy zależne od zużycia, a w zasadzie od planowanego zużycia zakładanego przez zarządcę. Zakładane zużycie jest mnożone przez cenę za JEDNOSTKĘ i w ten sposób stanowi jedną ze składowych czynszu.

Co można by było zautomatyzować:
- Najemca nie wysyła odczytów mailem - zamiast tego loguje się do systemu i wpisuje odczyty bezpośrednio do systemu
- Jeśli najemca nie zaloguje odczytów, wysyłamy przypomnienie mailowe do najemcy oraz info do mnie jeśli nadal nie zrobi tego w 24h
- Kalkulacje są zautomatyzowane
- Na podstawie wyników kalkulacji dostaję raport o potrzebie wykonania przelewu (nadpłata najemcy) lub przypomnienie o sprawdzeniu, swojego konta 72h po tym jak najemca dostanie maila
- W przypadku niedopłaty najemcy, najemca dostaje maila z informacją o konieczności wykonania dopłaty

Przypadki specjalne:
1. Aktualizacja czynszu. Powoduje konieczność ustalenia nowej ceny jednostkowej za media, prognozowanych ilości zużycia oraz całkowitej należnej Zarządcy wartości czynszu.
2. Wymiana liczników. Powoduje konieczność nadpisania wartości bazowej <WARTOŚĆ BAZOWA>  
3. Rozliczenie. Każdy raport powinien być logowany (jego szczegóły powinny być dostępne w formie rozbudowanej listy wpisów). Admnistrator ma możliwość wejścia na specjalny panel raportów i dla każdego raportu powinen móc wypełnić pole daty kiedy rozliczenie zostało zrealizowane i check box, że zostało zrealizowane (data jest opcjonalna).

Wymagania niefunkcjonalne:
- Wszystkie zmiany dotyczące  CZYNSZu, ODCZYTu, RAPORTu powinny być logowane w bazie jako  log  aktywności

Co wchodzi w zakres projektu:
- logowanie użytkownika (najemca)
- logowanie administratora (wynajmujący)
- dodawanie odczytów (najemca)
- CRUD czynszu; pola: 
	- wartości czynszu pobieranego przez zarządcę 
	- wartość trzech mediów (zimna woda, ciepła woda, CO) - pola dla każdego z mediów: 
		- cena jednostki, 
		- ilość jednostek przewidywanego przez zarządcę zużycia
	- daty obowiązywania czynszu

Co nie wchodzi w zakres projektu:
- Odczytywanie danych z systemu e-kartoteka. Tę czynność wykonam samodzielnie. Potrzebuję tylko panel do wprowadzania wartości czynszu pobieranego przez zarządcę oraz trzech mediów (zimna woda, ciepła woda, CO), przy czym media wymagają dwóch pól do wypełnienia (cena jednostki, ilość jednostek przewidywanego przez zarządcę zużycia)

</project_description>

Analyze the information provided, focusing on aspects relevant to PRD creation. Consider the following questions:
<prd_analysis>
1. Identify the main problem that the product is intended to solve.
2. Define the key functionalities of the MVP.
3. Consider potential user stories and paths of product usage.
4. Think about success criteria and how to measure them.
5. Assess design constraints and their impact on product development.
</prd_analysis>

Based on your analysis, generate a list of 10 questions and recommendations in a combined form (question + recommendation). These should address any ambiguities, potential issues, or areas where more information is needed to create an effective PRD. Consider questions about:

1. Details of the user's problem
2. Prioritization of functionality
3. Expected user experience
4. Measurable success indicators
5. Potential risks and challenges
6. Schedule and resources

<questions>
List your questions and recommendations here, numbered for clarity:

For example:
1. Are you planning to introduce paid subscriptions from the start of the project?

Recommendation: The first phase of the project could focus on free features to attract users, and paid features could be introduced at a later stage.
</questions>

Continue this process, generating new questions and recommendations based on the user's responses, until the user explicitly asks for a summary.

Remember to focus on clarity, relevance, and accuracy of results. Do not include any additional comments or explanations beyond the specified output format.

Analytical work should be done in the thinking block. The final output should consist solely of questions and recommendations and should not duplicate or repeat any work done in the prd_analysis section.