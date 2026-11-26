import React, { useState } from 'react';

const CIPHER_HISTORIES = {
    caesar: {
        title: 'Historia i Kryptoanaliza: Szyfr Cezara',
        badge: 'Rzymska Starożytność',
        origin: {
            title: 'Pochodzenie i Juliusz Cezar',
            summary:
                'Szyfr został nazwany na cześć rzymskiego wodza i dyktatora Juliusza Cezara (100–44 p.n.e.), który używał go do ochrony wojskowej korespondencji z dowódcami swoich legionów.',
            content: (
                <>
                    <p>
                        Według rzymskiego historyka Swetoniusza (<em>Żywoty cezarów</em>), Cezar stosował przesunięcie o <strong>3 pozycje</strong> (litera A stawała się D, B stawała się E itd.):
                    </p>
                    <blockquote className="history-quote">
                        „Jeśli miał coś poufnego do przekazania, pisał to szyfrem, to znaczy zmieniając porządek liter tak, aby żadne słowo nie mogło być odczytane. Kto chciałby to odcyfrować, musiał zamienić czwartą literę alfabetu, czyli D, na A i tak dalej.”
                    </blockquote>
                    <p>
                        W starożytnym Rzymie większość wrogów Cezara była niepiśmienna, a nawet piśmienni nie potrafili rozpoznać w zaszyfrowanym tekście języka łacińskiego, co czyniło szyfr wówczas wystarczająco skutecznym.
                    </p>
                </>
            ),
        },
        vulnerability: {
            title: 'Podatności i Słabe Punkty (Brute Force)',
            summary:
                'Szyfr Cezara posiada krytyczną słabość: przestrzeń kluczy wynosi zaledwie 25 w alfabecie łacińskim (lub 31 w polskim), co czyni go całkowicie bezbronnym wobec ataku Brute Force.',
            content: (
                <>
                    <div className="callout callout--danger">
                        <strong>Kluczowa luka bezpieczeństwa:</strong>
                        <p>
                            Dla alfabetu angielskiego/łacińskiego istnieje tylko <strong>25 nietrywialnych kluczy</strong> (przesunięcie o 26 daje ten sam tekst). Dla polskiego alfabetu są to <strong>31 klucze</strong>.
                        </p>
                    </div>
                    <h4>Atak siłowy (Brute Force)</h4>
                    <p>
                        Kryptoanalityk nie potrzebuje żadnej wiedzy o kluczu. Wystarczy wypisać zaledwie 25 alternatywnych wersji odszyfrowanego tekstu – jedna z nich natychmiast ujawni sensowny tekst w języku naturalnym. Komputer wykonuje taki atak w ułamku milisekundy.
                    </p>
                    <h4>Kryptoanaliza częstotliwościowa</h4>
                    <p>
                        Jako szyfr monoalfabetyczny, Szyfr Cezara nie zmienia proporcji występowania liter. Najczęstsza litera w szyfrogramie najprawdopodobniej odpowiada najczęstszej literze w języku (np. <strong>A</strong> lub <strong>E</strong> w języku polskim). Różnica ich pozycji od razu demaskuje wartość klucza.
                    </p>
                </>
            ),
        },
        trivia: {
            title: 'Ciekawostka: ROT13',
            content: (
                <p>
                    Współczesnym wariantem szyfru Cezara jest <strong>ROT13</strong> (przesunięcie o 13 pozycji w 26-literowym alfabecie łacińskim). Ponieważ 13 to dokładnie połowa z 26, ta sama funkcja służy zarówno do szyfrowania, jak i deszyfrowania! Był powszechnie stosowany na forach Usenet do ukrywania spoilerów i puent dowcipów.
                </p>
            ),
        },
        sources: {
            title: 'Źródła i literatura',
            summary: 'Źródła antyczne oraz współczesne opracowania historyczne i kryptograficzne.',
            items: [
                {
                    author: 'Gajusz Swetoniusz Trankwillus',
                    title: 'Żywoty cezarów (De vita Caesarum), ks. I: Boski Juliusz, rozdz. 56',
                    details: 'ok. 121 n.e. — najstarszy zachowany opis szyfru przesuwającego stosowanego przez Juliusza Cezara.',
                    url: 'https://pl.wikipedia.org/wiki/Szyfr_Cezara',
                },
                {
                    author: 'Kasjusz Dion',
                    title: 'Historia rzymska (Historia Romana), ks. XL, rozdz. 9',
                    details: 'III w. n.e. — relacja potwierdzająca użycie szyfru w korespondencji wojskowej Cezara.',
                },
                {
                    author: 'David Kahn',
                    title: 'Łamacze kodów. Historia tajnopisów od starożytności do Internetu (The Codebreakers)',
                    details: 'Wydawnictwa Naukowo-Techniczne / Scribner (1996) — rozdział poświęcony kryptografii starożytnej.',
                },
                {
                    author: 'Simon Singh',
                    title: 'Księga szyfrów (The Code Book)',
                    details: 'Wydawnictwo Albatros (2001) — omówienie szyfru Cezara i podstaw kryptoanalizy częstotliwościowej.',
                },
            ],
        },
    },
    vigenere: {
        title: 'Historia i Kryptoanaliza: Szyfr Vigenère’a',
        badge: 'Renesans i Złamanie w XIX w.',
        origin: {
            title: '„Szyfr nie do złamania” (Le Chiffre Indéchiffrable)',
            summary:
                'Przez ponad 300 lat Szyfr Vigenère’a uchodził za absolutnie niemożliwy do złamania (le chiffre indéchiffrable). Dopiero w XIX wieku opracowano metody jego skutecznej kryptoanalizy.',
            content: (
                <>
                    <p>
                        Choć nosi nazwisko francuskiego dyplomaty <strong>Blaise\'a de Vigenère</strong> (który opisał go w 1586 roku), prawdziwym twórcą idei polialfabetycznego szyfrowania ze słowem kluczowym był włoski kryptograf <strong>Giovan Battista Bellaso</strong> w 1653 roku, bazujący na tablicy <em>Tabula Recta</em> opata Johannesa Trithemiusa.
                    </p>
                    <p>
                        W odróżnieniu od szyfrów monoalfabetycznych, ta sama litera tekstu jawnego (np. „A”) może w zależności od pozycji w słowie kluczowym zostać zaszyfrowana jako różne litery, a ta sama litera szyfrogramu może oznaczać zupełnie inne znaki źródłowe.
                    </p>
                </>
            ),
        },
        vulnerability: {
            title: 'Jak analiza częstotliwościowa pozwala złamać Vigenère’a',
            summary:
                'Wykrycie powtórzeń w tekście i analiza częstotliwościowa pozwalają najpierw poznać długość hasła, a następnie rozbić szyfr na niezależne szyfry Cezara.',
            content: (
                <>
                    <div className="callout callout--info">
                        <strong>Metodologia łamania szyfru w 2 krokach:</strong>
                        <ol>
                            <li>Odgadnięcie długości klucza <em>L</em> (Metoda Kasiskiego / Test Friedmana).</li>
                            <li>Rozbicie szyfrogramu na <em>L</em> podtekstów i analiza częstotliwości każdego z nich.</li>
                        </ol>
                    </div>
                    <h4>Test Kasiskiego (1863 r.)</h4>
                    <p>
                        Major pruski Friedrich Kasiski zauważył, że powtarzające się fragmenty tekstu jawnego zaszyfrowane tym samym fragmentem cyklicznego klucza dają identyczne sekwencje w szyfrogramie. Odległości pomiędzy powtórzeniami są wielokrotnościami długości klucza! Znajdując największy wspólny dzielnik (NWD) tych odległości, kryptoanalityk z dużą pewnością ustala długość hasła.
                    </p>
                    <h4>Test Friedmana (Indeks Koincydencji)</h4>
                    <p>
                        William Friedman w latach 20. XX wieku wprowadził miarę statystyczną – <strong>indeks koincydencji (IoC)</strong>. W języku naturalnym prawdopodobieństwo wylosowania dwóch takich samych liter wynosi ~0.060-0.068. W tekście zaszyfrowanym Vigenèrem spada ono ku wartości losowej (~0.038). Wartość IoC pozwala bezpośrednio obliczyć przybliżoną długość hasła.
                    </p>
                    <h4>Finał: Rozbicie na szyfry Cezara</h4>
                    <p>
                        Gdy długość klucza <em>L</em> jest znana, szyfrogram dzielimy na <em>L</em> strumieni: co <em>L</em>-tą literę. Każdy taki strumień to zwykły <strong>szyfr Cezara</strong> o stałym przesunięciu, który łamie się klasyczną analizą częstotliwościową w sekundy!
                    </p>
                </>
            ),
        },
        trivia: {
            title: 'Wojna Secesyjna i Charles Babbage',
            content: (
                <p>
                    Szyfr Vigenère\'a był szeroko używany m.in. przez Konfederację w trakcie Wojny Secesyjnej (1861–1865). Angielski polimat <strong>Charles Babbage</strong> złamał ten szyfr już w 1854 roku, jednak armia brytyjska utrzymała jego metodę w ścisłej tajemnicy ze względów militarnych podczas Wojny Krymskiej.
                </p>
            ),
        },
        sources: {
            title: 'Źródła i literatura',
            summary: 'Traktaty renesansowe oraz klasyczne publikacje z dziedziny kryptoanalizy.',
            items: [
                {
                    author: 'Giovan Battista Bellaso',
                    title: 'La cifra del Sig. Giovan Battista Bellaso',
                    details: 'Wenecja (1553) — pierwsza publikacja opisująca szyfrowanie polialfabetyczne z użyciem słowa kluczowego.',
                },
                {
                    author: 'Blaise de Vigenère',
                    title: 'Traicté des chiffres, ou secrètes manières d\'escrire',
                    details: 'Paryż (1586) — traktat popularyzujący tablice polialfabetyczne i szyfr z autokluczem.',
                    url: 'https://pl.wikipedia.org/wiki/Szyfr_Vigen%C3%A8re%E2%80%99a',
                },
                {
                    author: 'Johannes Trithemius',
                    title: 'Polygraphiae libri sex',
                    details: '1518 — najstarsze drukowane źródło opisujące tablicę Tabula Recta.',
                },
                {
                    author: 'Friedrich Wilhelm Kasiski',
                    title: 'Die Geheimschriften und die Dechiffrir-Kunst',
                    details: 'Berlin (1863) — pierwsza opublikowana metoda ustalania długości klucza szyfru Vigenère’a.',
                },
                {
                    author: 'William F. Friedman',
                    title: 'The Index of Coincidence and Its Applications in Cryptography',
                    details: 'Riverbank Publication No. 22 (1922) — wprowadzenie indeksu koincydencji (IoC).',
                },
            ],
        },
    },
    playfair: {
        title: 'Historia i Kryptoanaliza: Szyfr Playfair',
        badge: 'XIX wiek i Wojny Światowe',
        origin: {
            title: 'Pochodzenie i Sir Charles Wheatstone',
            summary:
                'Choć nosi imię Lorda Playfaira, który go promował, szyfr został opracowany w 1854 roku przez wybitnego naukowca Charlesa Wheatstone’a.',
            content: (
                <>
                    <p>
                        Lord Lyon Playfair zaprezentował ten szyfr brytyjskim dyplomatom i wojskowym. Był to <strong>pierwszy w historii praktyczny szyfr digraficzny</strong> – szyfrujący całe pary liter zamiast pojedynczych znaków na podstawie macierzy 5×5.
                    </p>
                    <p>
                        Dzięki operacjom na parach liter szyfr ten znacznie lepiej opiera się prostej analizie częstotliwościowej pojedynczych liter. Był z sukcesem wykorzystywany przez armię brytyjską w wojnach burskich oraz podczas I i II Wojny Światowej do szyfrowania meldunków taktycznych na szczeblu polowym.
                    </p>
                </>
            ),
        },
        vulnerability: {
            title: 'Słabości i Kryptoanaliza Digramów',
            summary:
                'Zamiast 25 pojedynczych liter kryptoanalityk bada 600 możliwych digramów. Rozkład par liter nadal ujawnia strukturę języka naturalnego.',
            content: (
                <>
                    <div className="callout callout--danger">
                        <strong>Kluczowa cecha digraficzna:</strong>
                        <p>
                            W języku naturalnym pewne pary liter występują znacznie częściej niż inne (np. w angielskim „TH”, „HE”, „IN”, a w polskim „ST”, „PR”, „OW”).
                        </p>
                    </div>
                    <h4>Analiza częstotliwości digramów</h4>
                    <p>
                        Przy odpowiednio długim szyfrogramie najczęstsze pary kryptogramu odpowiadają najczęstszym digramom danego języka, co pozwala zrekonstruować siatkę 5×5 bez znajomości hasła.
                    </p>
                    <h4>Brak możliwości zaszyfrowania litery w samą siebie w parze</h4>
                    <p>
                        Litera w szyfrze Playfair nigdy nie może zostać zaszyfrowana jako ona sama w ramach tej samej pary znaków. Jeśli para „TH” szyfruje się do „XQ”, to ani pierwsza litera nie może być „T”, ani druga „H”. Ta reguła jest potężną wskazówką dla kryptoanalityka eliminującą tysiące fałszywych permutacji klucza.
                    </p>
                </>
            ),
        },
        trivia: {
            title: 'Ciekawostka: John F. Kennedy i PT-109',
            content: (
                <p>
                    Podczas II Wojny Światowej na Pacyfiku, gdy kuter torpedowy PT-109 dowodzony przez przyszłego prezydenta USA Johna F. Kennedy’ego został zatopiony przez japoński niszczyciel, meldunek o ocaleniu załogi został nadany przez australijskiego obserwatora właśnie przy użyciu szyfru Playfair.
                </p>
            ),
        },
        sources: {
            title: 'Źródła i literatura',
            summary: 'Opracowania historyczne dotyczące szyfru Wheatstone’a–Playfaira i epizodu PT-109.',
            items: [
                {
                    author: 'Charles Wheatstone & Lyon Playfair',
                    title: 'Dokumentacja szyfru digraficznego z siatką 5×5',
                    details: '1854 — opis oryginalnej metody opracowanej przez Charlesa Wheatstone’a i promowanej przez Lorda Playfaira.',
                    url: 'https://pl.wikipedia.org/wiki/Szyfr_Playfair',
                },
                {
                    author: 'David Kahn',
                    title: 'The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet',
                    details: 'Scribner (1996) — historia zastosowań wojskowych podczas wojen burskich oraz I i II wojny światowej.',
                },
                {
                    author: 'Simon Singh',
                    title: 'Księga szyfrów (The Code Book)',
                    details: 'Wydawnictwo Albatros (2001) — analiza własności digramowych szyfru Playfair.',
                },
                {
                    author: 'Robert J. Donovan',
                    title: 'PT 109: John F. Kennedy in World War II',
                    details: 'McGraw-Hill (1961) — relacja z nadania meldunku ratunkowego szyfrem Playfair na Pacyfiku w 1943 r.',
                },
            ],
        },
    },
};

export default function CipherHistoryInfo({ cipherType = 'caesar' }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openSections, setOpenSections] = useState({
        origin: true,
        vulnerability: true,
        trivia: false,
        sources: true,
    });

    const data = CIPHER_HISTORIES[cipherType];
    if (!data) return null;

    const toggleSection = (key) => {
        setOpenSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <>
            <button 
                type="button" 
                className="secondary-button" 
                onClick={() => setIsModalOpen(true)}
                style={{ marginTop: '0.5rem', width: 'auto', minWidth: '200px' }}
            >
                Tło historyczne
            </button>

            {isModalOpen && (
                <div
                    className="modal-overlay"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => setIsModalOpen(false)}
                            aria-label="Zamknij okno tła historycznego"
                        >
                            ✕
                        </button>
                        
                        <aside className="cipher-history-panel" aria-label="Informacje historyczne i kryptoanalityczne" style={{boxShadow: 'none', border: 'none', padding: 0}}>
                            <div className="cipher-history-panel__header" style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
                                <span className="badge badge--history">{data.badge}</span>
                                <h3 className="history-panel-title" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{data.title}</h3>
                                <p className="history-panel-subtitle">
                                    Poznaj genezę, kontekst historyczny oraz matematyczne słabości stojące za tym algorytmem.
                                </p>
                            </div>

                            <div className="accordion-list">
                                {/* Sekcja 1: Pochodzenie i historia */}
                                <div className={`accordion-item ${openSections.origin ? 'accordion-item--open' : ''}`}>
                                    <button
                                        type="button"
                                        className="accordion-trigger"
                                        onClick={() => toggleSection('origin')}
                                        aria-expanded={openSections.origin}
                                    >
                                        <div className="accordion-title-box">
                                            <span className="accordion-title">{data.origin.title}</span>
                                            <span className="accordion-summary">{data.origin.summary}</span>
                                        </div>
                                        <span className="accordion-arrow">{openSections.origin ? '▲' : '▼'}</span>
                                    </button>
                                    {openSections.origin && (
                                        <div className="accordion-body">
                                            {data.origin.content}
                                        </div>
                                    )}
                                </div>

                                {/* Sekcja 2: Słabe punkty i podatności */}
                                <div className={`accordion-item accordion-item--vulnerability ${openSections.vulnerability ? 'accordion-item--open' : ''}`}>
                                    <button
                                        type="button"
                                        className="accordion-trigger"
                                        onClick={() => toggleSection('vulnerability')}
                                        aria-expanded={openSections.vulnerability}
                                    >
                                        <div className="accordion-title-box">
                                            <span className="accordion-title">{data.vulnerability.title}</span>
                                            <span className="accordion-summary">{data.vulnerability.summary}</span>
                                        </div>
                                        <span className="accordion-arrow">{openSections.vulnerability ? '▲' : '▼'}</span>
                                    </button>
                                    {openSections.vulnerability && (
                                        <div className="accordion-body">
                                            {data.vulnerability.content}
                                        </div>
                                    )}
                                </div>

                                {/* Sekcja 3: Ciekawostka */}
                                <div className={`accordion-item ${openSections.trivia ? 'accordion-item--open' : ''}`}>
                                    <button
                                        type="button"
                                        className="accordion-trigger"
                                        onClick={() => toggleSection('trivia')}
                                        aria-expanded={openSections.trivia}
                                    >
                                        <div className="accordion-title-box">
                                            <span className="accordion-title">{data.trivia.title}</span>
                                        </div>
                                        <span className="accordion-arrow">{openSections.trivia ? '▲' : '▼'}</span>
                                    </button>
                                    {openSections.trivia && (
                                        <div className="accordion-body">
                                            {data.trivia.content}
                                        </div>
                                    )}
                                </div>

                                {/* Sekcja 4: Źródła i literatura */}
                                {data.sources && (
                                    <div className={`accordion-item ${openSections.sources ? 'accordion-item--open' : ''}`}>
                                        <button
                                            type="button"
                                            className="accordion-trigger"
                                            onClick={() => toggleSection('sources')}
                                            aria-expanded={openSections.sources}
                                        >
                                            <div className="accordion-title-box">
                                                <span className="accordion-title">{data.sources.title}</span>
                                                <span className="accordion-summary">{data.sources.summary}</span>
                                            </div>
                                            <span className="accordion-arrow">{openSections.sources ? '▲' : '▼'}</span>
                                        </button>
                                        {openSections.sources && (
                                            <div className="accordion-body">
                                                <ol className="history-sources-list">
                                                    {data.sources.items.map((source, idx) => (
                                                        <li key={idx} className="history-source-item">
                                                            <span className="history-source-author">{source.author}</span>
                                                            {', '}
                                                            <span className="history-source-title">{source.title}</span>
                                                            {source.details && (
                                                                <span className="history-source-details"> — {source.details}</span>
                                                            )}
                                                            {source.url && (
                                                                <a
                                                                    href={source.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="history-source-link"
                                                                >
                                                                    Źródło ↗
                                                                </a>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </>
    );
}
