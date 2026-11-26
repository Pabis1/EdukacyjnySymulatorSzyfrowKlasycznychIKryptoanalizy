import { useEffect, useState } from 'react';
import './App.css';
import CaesarShiftVisualizer from './components/CaesarShiftVisualizer';
import CipherHistoryInfo from './components/CipherHistoryInfo';
import CryptanalysisView from './components/CryptanalysisView';
import NotesManagementPanel from './components/NotesManagementPanel';
import PlayfairSimulator from './components/PlayfairSimulator';
import SpellcheckToggleButton from './components/SpellcheckToggleButton';

const INITIAL_NOTES = [
    {
        id: 'note-1',
        title: 'Przechwycona depesza polowa (Szyfr Cezara)',
        cipherType: 'Szyfr Cezara',
        content: 'Śekóćę ź yh ńsfą łgbc nzd rwo umtaźp ilj! Mtźśyrcócnlac falcńc wźlgyólg.',
        notes: 'Przechwycony meldunek polowy. Wyraźne maksima samogłosek przesunięte względem języka naturalnego, wskazujące na szyfr monoalfabetyczny.',
        createdAt: '2026-11-18 14:30',
    },
    {
        id: 'note-2',
        title: 'Tajna wiadomość dyplomatyczna (Szyfr Vigenère’a)',
        cipherType: 'Szyfr Vigenère’a',
        content: 'Wtoźm Auzathźk omtl oź godogp tlę abcąplc śya efó ęmacłl zglśń ogl ehfmm ćtą fmfta mra ndh óećuefy.',
        notes: 'Szyfrogram wieloalfabetyczny ze spłaszczonym rozkładem częstotliwości liter i niskim indeksem koincydencji (~0.038).',
        createdAt: '2026-11-18 15:15',
    },
    {
        id: 'note-3',
        title: 'Tekst referencyjny języka polskiego (Pan Tadeusz)',
        cipherType: 'Tekst jawny',
        content: 'Litwo Ojczyzno moja ty jesteś jak zdrowie ile cię trzeba cenić ten tylko się dowie kto cię stracił dziś piękność twą w całej ozdobie widzę i opisuję bo tęsknię po tobie',
        notes: 'Wzorzec naturalnego języka polskiego – dominuje litera A (~8.9%), I (~8.2%), O (~7.7%) i E (~7.6%).',
        createdAt: '2026-11-18 15:40',
    },
    {
        id: 'note-4',
        title: 'Klasyczna depesza Cezara (A-Z, przesunięcie 3)',
        cipherType: 'Szyfr Cezara',
        content: 'Khoor zruog! Fubswrjudskb lv ixq dqg hdvb wr euhdn eb euxwh irufh.',
        notes: 'Alfabet łaciński 26 liter, klucz shift = 3.',
        createdAt: '2026-11-18 16:00',
    },
    {
        id: 'note-5',
        title: 'Meldunek taktyczny (Szyfr Playfair, klucz MONARCHY)',
        cipherType: 'Szyfr Playfair',
        content: 'BMODZBXDNABEKUDMUIXMMOUVIF',
        notes: 'Szyfrogram digraficzny oparty na macierzy 5×5 wygenerowanej z hasła MONARCHY.',
        createdAt: '2026-11-19 10:00',
    },
];

const CIPHER_MODULES = [
    {
        id: 'caesar',
        name: 'Szyfr Cezara',
        category: 'Kryptografia Klasyczna',
        badge: 'Podstawowy',
        description: 'Klasyczny szyfr podstawieniowy przesuwający litery o stałą wartość klucza. Idealny punkt startowy.',
        icon: '',
        available: true,
    },
    {
        id: 'vigenere',
        name: 'Szyfr Vigenère’a',
        category: 'Kryptografia Klasyczna',
        badge: 'Średniozaawansowany',
        description: 'Polialfabetyczny szyfr oparty na powtarzanym słowie kluczowym, który zrewolucjonizował renesansową kryptografię.',
        icon: '',
        available: true,
    },
    {
        id: 'playfair',
        name: 'Szyfr Playfair',
        category: 'Kryptografia Klasyczna',
        badge: 'Średniozaawansowany',
        description: 'Pierwszy w historii praktyczny szyfr digraficzny. Szyfruje pary liter wykorzystując specjalną macierz 5×5 wygenerowaną na podstawie hasła.',
        icon: '',
        available: true,
    },
    {
        id: 'cryptanalysis',
        name: 'Kryptoanaliza / Łamanie Szyfrów',
        category: 'Kryptoanaliza & Statystyka',
        badge: 'Wykresy & Analiza',
        description: 'Wizualizacja statystyk liter w szyfrogramie, interaktywne przesuwanie wykresu, tło języka polskiego i atak Brute Force.',
        icon: '',
        available: true,
    },
    {
        id: 'notes',
        name: 'Zarządzanie Notatkami i Wykresami',
        category: 'Narzędzia Analityczne',
        badge: 'Notatnik Badacza',
        description: 'Panel zarządzania zapisanymi notatkami, próbkami szyfrogramów i wykresami. Wybierz notatkę i przenieś do analizy.',
        icon: '',
        available: true,
    },
];

const MODES = {
    encrypt: {
        tab: 'Szyfrowanie',
        inputLabel: 'Tekst jawny (Plaintext)',
        inputPlaceholder: 'Wpisz wiadomość do zaszyfrowania...',
        outputLabel: 'Szyfrogram (Ciphertext)',
        shiftSign: '+',
    },
    decrypt: {
        tab: 'Deszyfrowanie',
        inputLabel: 'Szyfrogram (Ciphertext)',
        inputPlaceholder: 'Wpisz szyfrogram do odszyfrowania...',
        outputLabel: 'Tekst jawny (Plaintext)',
        shiftSign: '-',
    },
};

function StepsVisualization({ cipherPackage }) {
    if (!cipherPackage?.steps || cipherPackage.steps.length === 0) {
        return null;
    }

    const { steps } = cipherPackage;
    const modifiedCount = steps.filter((s) => s.operation_details.is_modified).length;
    const unmodifiedCount = steps.length - modifiedCount;

    return (
        <section className="steps-container" aria-label="Wizualizacja kroków transformacji">
            <div className="steps-header">
                <div>
                    <h2 className="steps-title">Wizualizacja transformacji krok po kroku</h2>
                    <p className="steps-subtitle">
                        Szczegółowe dane dla każdego znaku tekstu.
                    </p>
                </div>
                <div className="steps-stats">
                    <span className="stat-chip">
                        Znaki: <strong>{steps.length}</strong>
                    </span>
                    <span className="stat-chip stat-chip--modified">
                        Przekształcone: <strong>{modifiedCount}</strong>
                    </span>
                    <span className="stat-chip stat-chip--unmodified">
                        Bez zmian: <strong>{unmodifiedCount}</strong>
                    </span>
                </div>
            </div>

            <div className="steps-list">
                {steps.map((step) => {
                    const isMod = step.operation_details.is_modified;
                    return (
                        <div
                            key={step.index}
                            className={`step-card ${isMod ? 'step-card--modified' : 'step-card--unmodified'}`}
                        >
                            <div className="step-card__header">
                                <span className="step-card__index">#{step.index + 1}</span>
                                <span className={`step-card__status ${isMod ? 'step-card__status--mod' : ''}`}>
                                    {isMod ? 'Zmieniono' : 'Pominięto'}
                                </span>
                            </div>

                            <div className="step-card__chars">
                                <div className="char-box">
                                    <span className="char-box__label">Wejście</span>
                                    <span className="char-box__val">
                                        {step.input_char === ' ' ? '␣' : step.input_char}
                                    </span>
                                </div>
                                <span className="step-card__arrow">→</span>
                                <div className="char-box">
                                    <span className="char-box__label">Wyjście</span>
                                    <span className="char-box__val">
                                        {step.output_char === ' ' ? '␣' : step.output_char}
                                    </span>
                                </div>
                            </div>

                            <div className="step-card__details">
                                {isMod ? (
                                    <>
                                        <div className="detail-row">
                                            <span>Pozycja w alfabecie:</span>
                                            <strong>
                                                {step.operation_details.original_pos} → {step.operation_details.new_pos}
                                            </strong>
                                        </div>
                                        <div className="detail-row">
                                            <span>Wielkość:</span>
                                            <span>
                                                {step.operation_details.case === 'upper' ? 'Wielka' : 'Mała'}
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span>Przesunięcie:</span>
                                            <span>{step.operation_details.shift_applied}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="unmodified-reason">
                                        Znak spoza polskiego alfabetu – przepisany bez zmian.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function CaesarSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onTransferToAnalysis,
    onSaveToNotes,
}) {
    const [mode, setMode] = useState('encrypt');
    const [shift, setShift] = useState(3);
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);

    const modeConfig = MODES[mode];

    const handleTextChange = (newText) => {
        onTextChange(newText);
        if (!newText.trim()) {
            onCiphertextChange('');
        } else if (mode === 'decrypt') {
            onCiphertextChange(newText);
        }
    };

    useEffect(() => {
        if (!text.trim()) {
            setResult('');
            setCipherPackage(null);
            setError('');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`/api/v1/caesar/${mode}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        shift: Number(shift),
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    let errorMsg = 'Serwer zwrócił błąd.';
                    if (errData.detail) {
                        if (Array.isArray(errData.detail)) {
                            errorMsg = errData.detail.map((e) => e.msg).join(', ');
                        } else {
                            errorMsg = errData.detail;
                        }
                    }
                    setError(errorMsg);
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                setResult(data.final_text);
                setCipherPackage(data);
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                    onCiphertextChange(text);
                }
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, shift, mode, onCiphertextChange]);

    const handleUseResult = () => {
        onTextChange(result);
        setMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="cipher-view-container">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge">Symulator Kryptograficzny</span>
                <h1 className="title">Szyfr Cezara</h1>
                <p className="subtitle">
                    Wpisz tekst i ustaw przesunięcie, aby natychmiast zobaczyć wynik i matematyczną analizę krok po kroku.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="caesar" />
                </div>
            </header>
            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card">
                        <div className="mode-switch" role="group" aria-label="Tryb">
                            {Object.entries(MODES).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className="mode-switch__option"
                                    onClick={() => {
                                        setMode(key);
                                        setError('');
                                    }}
                                    aria-pressed={mode === key}
                                >
                                    {config.tab}
                                </button>
                            ))}
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="caesar-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    <SpellcheckToggleButton
                                        enabled={spellCheckEnabled}
                                        onToggle={() => setSpellCheckEnabled((prev) => !prev)}
                                    />
                                </div>
                                <textarea
                                    id="caesar-input-text"
                                    className="text-area"
                                    rows={3}
                                    value={text}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={modeConfig.inputPlaceholder}
                                    autoComplete="off"
                                    spellCheck={spellCheckEnabled}
                                />
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="caesar-shift">
                                        Klucz przesunięcia
                                    </label>
                                    <span className="shift-value">
                                        {modeConfig.shiftSign}{shift}
                                    </span>
                                </div>
                                <input
                                    id="caesar-shift"
                                    className="range"
                                    type="range"
                                    min="1"
                                    max="31"
                                    value={shift}
                                    onChange={(e) => setShift(e.target.value)}
                                />
                                <div className="range-scale" aria-hidden="true">
                                    <span>1</span>
                                    <span>15</span>
                                    <span>31</span>
                                </div>
                            </div>

                            {error && (
                                <div className="error" role="alert">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="field result">
                            <div className="field__header">
                                <label className="label" htmlFor="caesar-result-text">
                                    {modeConfig.outputLabel}
                                </label>
                                {result && (
                                    <div className="result__actions">
                                        <button
                                            type="button"
                                            className="link-button"
                                            onClick={handleUseResult}
                                        >
                                            Użyj wyniku
                                        </button>
                                        <button
                                            type="button"
                                            className="link-button"
                                            onClick={handleCopy}
                                        >
                                            {copied ? 'Skopiowano!' : 'Kopiuj'}
                                        </button>
                                        {onTransferToAnalysis && (
                                            <button
                                                type="button"
                                                className="link-button link-button--accent"
                                                onClick={() => onTransferToAnalysis(result)}
                                                title="Przenieś ten wynik bezpośrednio do modułu kryptoanalizy"
                                            >
                                                Przenieś do analizy →
                                            </button>
                                        )}
                                        {onSaveToNotes && (
                                            <button
                                                type="button"
                                                className="link-button"
                                                onClick={() =>
                                                    onSaveToNotes({
                                                        title: `Szyfr Cezara (${modeConfig.tab}, klucz ${modeConfig.shiftSign}${shift})`,
                                                        cipherType: 'Szyfr Cezara',
                                                        content: result,
                                                        notes: `Zapisano z symulatora Cezara. Wejście: "${text.slice(0, 45)}${text.length > 45 ? '...' : ''}", klucz: ${shift}.`,
                                                    })
                                                }
                                                title="Zapisz ten wynik w panelu notatek"
                                            >
                                                Zapisz w notatkach
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <textarea
                                id="caesar-result-text"
                                className="text-area text-area--result"
                                rows={3}
                                readOnly
                                spellCheck={false}
                                value={result}
                                placeholder="Wynik pojawi się tutaj automatycznie podczas pisania..."
                            />

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>{cipherPackage.metadata.cipher_type}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Przesunięcie: <strong>{modeConfig.shiftSign}{cipherPackage.metadata.shift}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Alfabet: <strong>{cipherPackage.metadata.alphabet_len} znaków</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* Graficzna reprezentacja przesuwania alfabetu klocków */}
                    <CaesarShiftVisualizer shift={shift} mode={mode} />

                    <StepsVisualization cipherPackage={cipherPackage} />
                </div>
            </div>
        </div>
    );
}

// Moduł 2: Szyfr Vigenère'a na żywo
function VigenereSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onTransferToAnalysis,
    onSaveToNotes,
}) {
    const [mode, setMode] = useState('encrypt');
    const [keyword, setKeyword] = useState('KLUCZ');
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);

    const modeConfig = MODES[mode];

    const handleTextChange = (newText) => {
        onTextChange(newText);
        if (!newText.trim()) {
            onCiphertextChange('');
        } else if (mode === 'decrypt') {
            onCiphertextChange(newText);
        }
    };

    useEffect(() => {
        if (!text.trim() || !keyword.trim()) {
            setResult('');
            setCipherPackage(null);
            setError('');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`/api/v1/vigenere/${mode}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        keyword: keyword,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    let errorMsg = 'Serwer zwrócił błąd.';
                    if (errData.detail) {
                        if (Array.isArray(errData.detail)) {
                            errorMsg = errData.detail.map((e) => e.msg).join(', ');
                        } else {
                            errorMsg = errData.detail;
                        }
                    }
                    setError(errorMsg);
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                setResult(data.final_text);
                setCipherPackage(data);
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                    onCiphertextChange(text);
                }
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, keyword, mode, onCiphertextChange]);

    const handleUseResult = () => {
        onTextChange(result);
        setMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="cipher-view-container">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge">Symulator Kryptograficzny</span>
                <h1 className="title">Szyfr Vigenère’a</h1>
                <p className="subtitle">
                    Wpisz wiadomość i słowo kluczowe, aby obserwować działanie szyfru polialfabetycznego.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="vigenere" />
                </div>
            </header>

            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card">
                        <div className="mode-switch" role="group" aria-label="Tryb">
                            {Object.entries(MODES).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className="mode-switch__option"
                                    onClick={() => {
                                        setMode(key);
                                        setError('');
                                    }}
                                    aria-pressed={mode === key}
                                >
                                    {config.tab}
                                </button>
                            ))}
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="vigenere-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    <SpellcheckToggleButton
                                        enabled={spellCheckEnabled}
                                        onToggle={() => setSpellCheckEnabled((prev) => !prev)}
                                    />
                                </div>
                                <textarea
                                    id="vigenere-input-text"
                                    className="text-area"
                                    rows={3}
                                    value={text}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={modeConfig.inputPlaceholder}
                                    autoComplete="off"
                                    spellCheck={spellCheckEnabled}
                                />
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="vigenere-keyword">
                                        Słowo kluczowe (Keyword)
                                    </label>
                                    <span className="shift-value">
                                        {keyword ? keyword.toUpperCase() : 'Brak'}
                                    </span>
                                </div>
                                <input
                                    id="vigenere-keyword"
                                    type="text"
                                    className="text-input"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Wpisz słowo kluczowe (np. KLUCZ)..."
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <span className="field-hint">
                                    Litery klucza określają cykliczne przesunięcia kolejnych znaków w polskim alfabecie.
                                </span>
                            </div>

                            {error && (
                                <div className="error" role="alert">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="field result">
                            <div className="field__header">
                                <label className="label" htmlFor="vigenere-result-text">
                                    {modeConfig.outputLabel}
                                </label>
                                {result && (
                                    <div className="result__actions">
                                        <button
                                            type="button"
                                            className="link-button"
                                            onClick={handleUseResult}
                                        >
                                            Użyj wyniku
                                        </button>
                                        <button
                                            type="button"
                                            className="link-button"
                                            onClick={handleCopy}
                                        >
                                            {copied ? 'Skopiowano!' : 'Kopiuj'}
                                        </button>
                                        {onTransferToAnalysis && (
                                            <button
                                                type="button"
                                                className="link-button link-button--accent"
                                                onClick={() => onTransferToAnalysis(result)}
                                                title="Przenieś ten wynik bezpośrednio do modułu kryptoanalizy"
                                            >
                                                Przenieś do analizy →
                                            </button>
                                        )}
                                        {onSaveToNotes && (
                                            <button
                                                type="button"
                                                className="link-button"
                                                onClick={() =>
                                                    onSaveToNotes({
                                                        title: `Szyfr Vigenère’a (${modeConfig.tab}, klucz ${keyword})`,
                                                        cipherType: 'Szyfr Vigenère’a',
                                                        content: result,
                                                        notes: `Zapisano z symulatora Vigenère'a. Wejście: "${text.slice(0, 45)}${text.length > 45 ? '...' : ''}", słowo kluczowe: ${keyword}.`,
                                                    })
                                                }
                                                title="Zapisz ten wynik w panelu notatek"
                                            >
                                                Zapisz w notatkach
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <textarea
                                id="vigenere-result-text"
                                className="text-area text-area--result"
                                rows={3}
                                readOnly
                                spellCheck={false}
                                value={result}
                                placeholder="Wynik pojawi się tutaj automatycznie podczas pisania..."
                            />

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>Vigenère</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Klucz: <strong>{cipherPackage.metadata.keyword}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Długość klucza: <strong>{cipherPackage.metadata.keyword.length}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Tryb: <strong>{cipherPackage.metadata.mode === 'encrypt' ? 'Szyfrowanie' : 'Deszyfrowanie'}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    <StepsVisualization cipherPackage={cipherPackage} />
                </div>
            </div>
        </div>
    );
}

// Główny komponent aplikacji
export default function App() {
    const [currentView, setCurrentView] = useState('home');
    const [caesarText, setCaesarText] = useState('');
    const [vigenereText, setVigenereText] = useState('');
    const [playfairText, setPlayfairText] = useState('');
    const [sharedCiphertext, setSharedCiphertext] = useState('');
    const [notes, setNotes] = useState(INITIAL_NOTES);
    const [toastMessage, setToastMessage] = useState('');
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem('theme', theme);
        } catch {
            // Ignoruj błąd zapisu w trybie prywatnym
        }
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#0f172a');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleAddNote = (newNote) => {
        setNotes((prev) => [newNote, ...prev]);
        showToast(`Dodano notatkę: "${newNote.title}"`);
    };

    const handleDeleteNote = (noteId) => {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast('Usunięto notatkę.');
    };

    const handleTransferToAnalysis = (content) => {
        setSharedCiphertext(content);
        setCurrentView('cryptanalysis');
        showToast('Przeniesiono dane do modułu kryptoanalizy.');
    };

    const handleSaveToNotesFromSimulator = (noteData) => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
        const newNote = {
            id: `note-${Date.now()}`,
            createdAt: dateStr,
            ...noteData,
        };
        handleAddNote(newNote);
    };

    return (
        <div className="app">
            {toastMessage && (
                <div className="global-toast" role="status">
                    {toastMessage}
                </div>
            )}

            {/* Pasek nawigacyjny z odnośnikami do strony głównej i modułów */}
            <nav className="edu-navbar" aria-label="Nawigacja główna">
                <button
                    type="button"
                    className="edu-logo"
                    onClick={() => setCurrentView('home')}
                >
                    <span className="logo-icon"></span>
                    <span className="logo-text">Symulator <strong>Edukacyjny</strong></span>
                    <span className="logo-badge">EDU</span>
                </button>
                <div className="edu-nav-links">
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
                        onClick={() => setCurrentView('home')}
                    >
                        Strona Główna
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'caesar' ? 'active' : ''}`}
                        onClick={() => setCurrentView('caesar')}
                    >
                        Szyfr Cezara
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'vigenere' ? 'active' : ''}`}
                        onClick={() => setCurrentView('vigenere')}
                    >
                        Szyfr Vigenère’a
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'playfair' ? 'active' : ''}`}
                        onClick={() => setCurrentView('playfair')}
                    >
                        Szyfr Playfair
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'cryptanalysis' ? 'active' : ''}`}
                        onClick={() => setCurrentView('cryptanalysis')}
                    >
                        Kryptoanaliza / Łamanie Szyfrów
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'notes' ? 'active' : ''}`}
                        onClick={() => setCurrentView('notes')}
                    >
                        Notatki / Wykresy
                    </button>
                    <button
                        type="button"
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-pressed={theme === 'light'}
                        title={theme === 'light' ? 'Przełącz na motyw ciemny' : 'Przełącz na motyw jasny'}
                    >
                        <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
                        <span>{theme === 'light' ? 'Motyw ciemny' : 'Motyw jasny'}</span>
                    </button>
                </div>
            </nav>

            {/* Widok: Strona Główna / Dashboard */}
            {currentView === 'home' && (
                <main className="dashboard-container">
                    <div className="dashboard-hero">
                        <span className="badge">Akademia Kryptografii</span>
                        <h1 className="hero-title">Wybierz moduł i rozpocznij naukę</h1>
                        <p className="hero-subtitle">
                            Interaktywne laboratorium algorytmów szyfrujących. Eksperymentuj, analizuj i poznawaj tajniki bezpieczeństwa danych.
                        </p>
                    </div>

                    <div className="ciphers-grid">
                        {CIPHER_MODULES.map((cipher) => (
                            <div
                                key={cipher.id}
                                className={`cipher-card ${!cipher.available ? 'disabled' : ''}`}
                                onClick={() => cipher.available && setCurrentView(cipher.id)}
                                role="button"
                                tabIndex={cipher.available ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (cipher.available && (e.key === 'Enter' || e.key === ' ')) {
                                        setCurrentView(cipher.id);
                                    }
                                }}
                            >
                                <div className="cipher-card__header">
                                    <span className="cipher-icon">{cipher.icon}</span>
                                    <span className={`cipher-badge ${cipher.available ? 'active' : 'locked'}`}>
                                        {cipher.available ? cipher.badge : 'Wkrótce'}
                                    </span>
                                </div>
                                <span className="cipher-category">{cipher.category}</span>
                                <h3 className="cipher-name">{cipher.name}</h3>
                                <p className="cipher-desc">{cipher.description}</p>
                                <div className="cipher-action">
                                    {cipher.available ? 'Uruchom moduł na żywo →' : 'Niedostępne'}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}

            {/* Widok: Symulator Cezara */}
            {currentView === 'caesar' && (
                <CaesarSimulator
                    onBack={() => setCurrentView('home')}
                    text={caesarText}
                    onTextChange={setCaesarText}
                    onCiphertextChange={setSharedCiphertext}
                    onTransferToAnalysis={handleTransferToAnalysis}
                    onSaveToNotes={handleSaveToNotesFromSimulator}
                />
            )}

            {/* Widok: Symulator Vigenère'a */}
            {currentView === 'vigenere' && (
                <VigenereSimulator
                    onBack={() => setCurrentView('home')}
                    text={vigenereText}
                    onTextChange={setVigenereText}
                    onCiphertextChange={setSharedCiphertext}
                    onTransferToAnalysis={handleTransferToAnalysis}
                    onSaveToNotes={handleSaveToNotesFromSimulator}
                />
            )}

            {/* Widok: Symulator Playfair */}
            {currentView === 'playfair' && (
                <PlayfairSimulator
                    onBack={() => setCurrentView('home')}
                    text={playfairText}
                    onTextChange={setPlayfairText}
                    onCiphertextChange={setSharedCiphertext}
                    onTransferToAnalysis={handleTransferToAnalysis}
                    onSaveToNotes={handleSaveToNotesFromSimulator}
                />
            )}

            {/* Widok: Kryptoanaliza / Łamanie Szyfrów */}
            {currentView === 'cryptanalysis' && (
                <CryptanalysisView
                    onBack={() => setCurrentView('home')}
                    initialCiphertext={sharedCiphertext}
                    onOpenNotes={() => setCurrentView('notes')}
                    theme={theme}
                />
            )}

            {/* Widok: Panel Zarządzania Notatkami i Wykresami */}
            {currentView === 'notes' && (
                <NotesManagementPanel
                    onBack={() => setCurrentView('home')}
                    notes={notes}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                    onTransferToAnalysis={handleTransferToAnalysis}
                />
            )}

            <footer className="footer">
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}
