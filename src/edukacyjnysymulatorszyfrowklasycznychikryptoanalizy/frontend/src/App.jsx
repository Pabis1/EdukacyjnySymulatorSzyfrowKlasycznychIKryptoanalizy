import { useEffect, useState } from 'react';
import './App.css';
import CaesarShiftVisualizer from './components/CaesarShiftVisualizer';
import CipherHistoryInfo from './components/CipherHistoryInfo';
import CryptanalysisView from './components/CryptanalysisView';
import HighlightableTextarea from './components/HighlightableTextarea';
import RedSpacesToggleButton from './components/RedSpacesToggleButton';
import {
    DEFAULT_PLAYFAIR_KEYWORD,
    MAX_PLAYFAIR_KEY_LENGTH,
    buildLocalPlayfairMatrix,
    formatCaesarShift,
    getEffectivePlayfairKeyword,
    normalizePlayfairKeyword,
} from './utils/cryptoUtils';

const FALLBACK_LANGUAGES = [
    { code: 'pl', name: 'Polski', alphabet: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ', alphabet_len: 32 },
    { code: 'en', name: 'English', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphabet_len: 26 },
    { code: 'de', name: 'Deutsch', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', alphabet_len: 29 },
    { code: 'es', name: 'Español', alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', alphabet_len: 27 },
    { code: 'el', name: 'Ελληνικά', alphabet: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', alphabet_len: 24 },
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
        description: 'Pierwszy w historii praktyczny szyfr digraficzny. Szyfruje pary liter wykorzystując specjalną macierz 5x5 wygenerowaną na podstawie słowa kluczowego.',
        icon: '',
        available: true,
    },
    {
        id: 'cryptanalysis',
        name: 'Kryptoanaliza / Łamanie Szyfrów',
        category: 'Kryptoanaliza & NLTK',
        badge: 'Wykresy & Analiza',
        description: 'Wizualizacja statystyk liter ze skokowym przesuwaniem wykresu, badanie IoC oraz łamanie Brute Force z modelem NLTK.',
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
    },
    decrypt: {
        tab: 'Deszyfrowanie',
        inputLabel: 'Szyfrogram (Ciphertext)',
        inputPlaceholder: 'Wpisz szyfrogram do odszyfrowania...',
        outputLabel: 'Tekst jawny (Plaintext)',
    },
};

function CipherLanguageBar({ languages, selectedLanguage, onSelect, playfairFixed = false }) {
    if (playfairFixed) {
        return (
            <div className="lang-toolbar">
                <span className="lang-toolbar__label">Alfabet szyfru:</span>
                <div className="alpha-switch" role="group" aria-label="Alfabet macierzy Playfair">
                    <button type="button" className="alpha-switch__btn active" aria-pressed="true">
                        Łaciński A–Z bez J (25 znaków, I = J)
                    </button>
                </div>
                <span className="field-hint">
                    Klasyczny Playfair wymaga siatki 5×5 (25 komórek) — litera J jest łączona z I, a znaki spoza A–Z są pomijane.
                </span>
            </div>
        );
    }

    return (
        <div className="lang-toolbar">
            <span className="lang-toolbar__label">Język alfabetu:</span>
            <div className="alpha-switch" role="group" aria-label="Wybór języka alfabetu">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        type="button"
                        className={`alpha-switch__btn ${selectedLanguage === lang.code ? 'active' : ''}`}
                        onClick={() => onSelect(lang.code)}
                        aria-pressed={selectedLanguage === lang.code}
                    >
                        {lang.name} ({lang.alphabet_len})
                    </button>
                ))}
            </div>
        </div>
    );
}

// Wirtualna klawiatura dla języków niepolskich (np. grecki, niemiecki, hiszpański, angielski)
function VirtualKeyboard({ languageObj, onInsert, onBackspace, targetLabel = 'Pole tekstu' }) {
    const [isUppercase, setIsUppercase] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!languageObj || languageObj.code === 'pl') {
        return null;
    }

    const chars = languageObj.alphabet.split('');

    return (
        <div className="virtual-keyboard" aria-label={`Wirtualna klawiatura: ${languageObj.name}`}>
            <div className="virtual-keyboard__header">
                <div className="virtual-keyboard__title">
                    <span>Wirtualna klawiatura: <strong>{languageObj.name}</strong></span>
                    <span className="vk-target-pill">Cel: {targetLabel}</span>
                </div>
                <div className="virtual-keyboard__actions">
                    <button
                        type="button"
                        className={`vk-ctrl-btn ${!isUppercase ? 'active' : ''}`}
                        onClick={() => setIsUppercase((prev) => !prev)}
                    >
                        {isUppercase ? 'ABC → abc' : 'abc → ABC'}
                    </button>
                    <button
                        type="button"
                        className="vk-ctrl-btn"
                        onClick={() => setIsCollapsed((prev) => !prev)}
                    >
                        {isCollapsed ? 'Pokaż ▼' : 'Ukryj ▲'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="virtual-keyboard__keys">
                    {chars.map((ch) => {
                        const displayChar = isUppercase ? ch : ch.toLowerCase();
                        return (
                            <button
                                key={ch}
                                type="button"
                                className="vk-key"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onInsert(displayChar)}
                            >
                                {displayChar}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        className="vk-key vk-key--wide"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onInsert(' ')}
                        title="Wstaw spację"
                    >
                        ␣ Spacja
                    </button>
                    <button
                        type="button"
                        className="vk-key vk-key--wide vk-key--danger"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onBackspace}
                        title="Usuń ostatni znak"
                    >
                        Usuń
                    </button>
                </div>
            )}
        </div>
    );
}

// Wyświetlacz wyniku podświetlający na czerwono znaki nieprzesunięte (spacje, interpunkcję, cyfry)
function HighlightedResultBox({ result, cipherPackage, placeholder, highlightSpaces = true }) {
    if (!result) {
        return (
            <div className="text-area text-area--result result-rich-box result-rich-box--empty" role="textbox" aria-readonly="true">
                {placeholder}
            </div>
        );
    }

    const steps = cipherPackage?.steps;
    const isPlayfair = cipherPackage?.metadata?.cipher_type === 'Playfair';

    if (!steps || steps.length === 0 || isPlayfair) {
        return (
            <div className="text-area text-area--result result-rich-box" role="textbox" aria-readonly="true">
                {result}
            </div>
        );
    }

    const hasUnmodified = steps.some(
        (s) => !s.operation_details.is_modified && (highlightSpaces || s.output_char !== ' '),
    );

    return (
        <div className="result-rich-wrapper">
            <div className="text-area text-area--result result-rich-box" role="textbox" aria-readonly="true">
                {steps.map((step, idx) => {
                    const isMod = step.operation_details.is_modified;
                    const ch = step.output_char;

                    if (isMod) {
                        return <span key={idx} className="res-char--modified">{ch}</span>;
                    }

                    if (ch === '\n') {
                        return <br key={idx} />;
                    }

                    if (ch === ' ') {
                        if (!highlightSpaces) {
                            return <span key={idx}>{' '}</span>;
                        }
                        return (
                            <span
                                key={idx}
                                className="res-char--unmodified res-char--space"
                                title="Spacja — znak nieprzesunięty (spoza alfabetu)"
                            >
                                {' '}
                            </span>
                        );
                    }

                    return (
                        <span
                            key={idx}
                            className="res-char--unmodified"
                            title={`Znak '${ch}' nie podlega przesunięciu (${step.operation_details.reason || 'spoza alfabetu'})`}
                        >
                            {ch}
                        </span>
                    );
                })}
            </div>

            {hasUnmodified && (
                <div className="unmodified-legend">
                    <span className="unmodified-legend__dot" />
                    <span>Na czerwono zaznaczono znaki nieprzesunięte (spacje, cyfry, interpunkcja spoza alfabetu).</span>
                </div>
            )}
        </div>
    );
}

function StepsVisualization({ cipherPackage, activeStepIndex = null, onStepHover = null }) {
    if (!cipherPackage?.steps || cipherPackage.steps.length === 0) {
        return null;
    }

    const { steps } = cipherPackage;
    const isPlayfair = cipherPackage?.metadata?.cipher_type === 'Playfair';
    const modifiedCount = steps.filter((s) => s.operation_details.is_modified).length;
    const unmodifiedCount = steps.length - modifiedCount;

    return (
        <section className="steps-container" aria-label="Wizualizacja kroków transformacji">
            <div className="steps-header">
                <div>
                    <h2 className="steps-title">Wizualizacja transformacji krok po kroku</h2>
                    <p className="steps-subtitle">
                        {isPlayfair
                            ? 'Szczegółowe przekształcenie każdego digramu (pary liter) według reguł Wiersza, Kolumny lub Prostokąta. Najedź na krok, aby podświetlić parę w macierzy 5×5!'
                            : 'Szczegółowe dane i wzory arytmetyki modularnej dla każdego znaku tekstu.'}
                    </p>
                </div>
                <div className="steps-stats">
                    <span className="stat-chip">
                        {isPlayfair ? 'Digramy:' : 'Znaki:'} <strong>{steps.length}</strong>
                    </span>
                    <span className="stat-chip stat-chip--modified">
                        Przekształcone: <strong>{modifiedCount}</strong>
                    </span>
                    {!isPlayfair && (
                        <span className="stat-chip stat-chip--unmodified">
                            Bez zmian: <strong>{unmodifiedCount}</strong>
                        </span>
                    )}
                </div>
            </div>

            <div className="steps-list">
                {steps.map((step, idx) => {
                    const isMod = step.operation_details.is_modified;
                    const isPlayfairRule = Boolean(step.operation_details.rule_applied);
                    const isHighlighted = activeStepIndex === idx;

                    return (
                        <div
                            key={`${step.index}-${idx}`}
                            className={`step-card ${isMod ? 'step-card--modified' : 'step-card--unmodified'} ${isHighlighted ? 'step-card--active' : ''}`}
                            onMouseEnter={() => onStepHover && onStepHover(idx)}
                            onMouseLeave={() => onStepHover && onStepHover(null)}
                            onClick={() => onStepHover && onStepHover(activeStepIndex === idx ? null : idx)}
                        >
                            <div className="step-card__header">
                                <span className="step-card__index">#{idx + 1}</span>
                                <div className="step-card__chars">
                                    <span className="char-badge input-char" title="Wejście">
                                        {step.input_char === ' ' ? '␣' : step.input_char}
                                    </span>
                                    <span className="step-card__arrow">→</span>
                                    <span className={`char-badge ${isMod ? 'output-char' : 'unmodified-char-badge'}`} title="Wyjście">
                                        {step.output_char === ' ' ? '␣' : step.output_char}
                                    </span>
                                </div>
                                <span
                                    className={`status-pill ${
                                        isMod ? 'status-pill--modified' : 'status-pill--unmodified'
                                    }`}
                                >
                                    {isPlayfairRule
                                        ? `Reguła: ${step.operation_details.rule_applied}`
                                        : isMod
                                        ? 'Przesunięty'
                                        : 'Niezmieniony'}
                                </span>
                            </div>

                            <div className="step-card__details">
                                {isPlayfairRule ? (
                                    <div className="step-formula-row">
                                        <span className="key-char-badge">
                                            {step.operation_details.rule_applied}
                                        </span>
                                        <span className="step-info">
                                            Poz. 1: [w:{step.operation_details.pos1[0] + 1}, k:{step.operation_details.pos1[1] + 1}]
                                            &nbsp;|&nbsp;
                                            Poz. 2: [w:{step.operation_details.pos2[0] + 1}, k:{step.operation_details.pos2[1] + 1}]
                                        </span>
                                    </div>
                                ) : isMod ? (
                                    <>
                                        <div className="step-formula-row">
                                            {step.operation_details.key_char && (
                                                <span className="key-char-badge" title="Litera klucza">
                                                    Klucz: {step.operation_details.key_char}
                                                </span>
                                            )}
                                            <div className="step-formula">
                                                <span className="formula-label">Wzór:</span>
                                                <code>{step.operation_details.formula}</code>
                                            </div>
                                        </div>
                                        <div className="step-info">
                                            Indeks w alfabecie: {step.operation_details.original_index} → {step.operation_details.new_index}
                                            {step.operation_details.shift_applied !== undefined && ` (przesunięcie: ${step.operation_details.shift_applied})`}
                                        </div>
                                    </>
                                ) : (
                                    <div className="step-reason">
                                        Powód: <em>{step.operation_details.reason}</em>
                                    </div>
                                )}
                                <p className="step-desc">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// Moduł 1: Szyfr Cezara
function CaesarSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onGoToAnalysis,
    languages,
    language,
    onLanguageChange,
}) {
    const [mode, setMode] = useState('encrypt');
    const [shift, setShift] = useState(3);
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(true);

    const activeLang = languages.find((l) => l.code === language) || FALLBACK_LANGUAGES[0];
    const maxShift = Math.max(1, activeLang.alphabet_len - 1);
    const modeConfig = MODES[mode];

    useEffect(() => {
        if (Number(shift) > maxShift) {
            setShift(maxShift);
        } else if (Number(shift) < -maxShift) {
            setShift(-maxShift);
        }
    }, [maxShift, shift]);

    const handleTextChange = (newText) => {
        onTextChange(newText);
        if (!newText.trim()) {
            onCiphertextChange('');
        } else if (mode === 'decrypt') {
            onCiphertextChange(newText, 'caesar');
        }
    };

    useEffect(() => {
        if (!text.trim()) {
            setResult('');
            setCipherPackage(null);
            setError('');
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
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
                        language: language,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    let errorMsg = 'Serwer zwrócił błąd.';
                    if (errData.detail) {
                        errorMsg = Array.isArray(errData.detail)
                            ? errData.detail.map((e) => e.msg).join(', ')
                            : errData.detail;
                    }
                    setError(errorMsg);
                    return;
                }

                const data = await response.json();
                setResult(data.final_text);
                setCipherPackage(data);
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text, 'caesar');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                    onCiphertextChange(text, 'caesar');
                }
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, shift, mode, language, onCiphertextChange]);

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
                    Wpisz tekst, wybierz język alfabetu i ustaw przesunięcie, aby zobaczyć wynik oraz matematyczną analizę krok po kroku.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="caesar" />
                </div>
            </header>

            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card">
                        <div className="card-top-bar">
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

                            <CipherLanguageBar
                                languages={languages}
                                selectedLanguage={language}
                                onSelect={onLanguageChange}
                            />
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="caesar-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    {mode === 'decrypt' && (
                                        <div className="field__header-actions">
                                            <RedSpacesToggleButton
                                                enabled={highlightSpaces}
                                                onToggle={() => setHighlightSpaces((prev) => !prev)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <HighlightableTextarea
                                    id="caesar-input-text"
                                    className="text-area"
                                    rows={3}
                                    value={text}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={modeConfig.inputPlaceholder}
                                    autoComplete="off"
                                    spellCheck={false}
                                    highlightSpaces={mode === 'decrypt' && highlightSpaces}
                                />

                                <VirtualKeyboard
                                    languageObj={activeLang}
                                    targetLabel={modeConfig.inputLabel}
                                    onInsert={(ch) => handleTextChange(text + ch)}
                                    onBackspace={() => handleTextChange(text.slice(0, -1))}
                                />
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="caesar-shift">
                                        Klucz przesunięcia ({activeLang.name})
                                    </label>
                                    <span className="shift-value" title={`Klucz: ${shift}`}>
                                        {formatCaesarShift(shift, mode)}
                                    </span>
                                </div>
                                <input
                                    id="caesar-shift"
                                    className="range"
                                    type="range"
                                    min={-maxShift}
                                    max={maxShift}
                                    value={shift}
                                    onChange={(e) => setShift(Number(e.target.value))}
                                />
                                <div className="range-scale" aria-hidden="true">
                                    <span>{-maxShift}</span>
                                    <span>0</span>
                                    <span>{maxShift}</span>
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
                                <label className="label">
                                    {modeConfig.outputLabel}
                                </label>
                                {result && (
                                    <div className="result__actions">
                                        <button
                                            type="button"
                                            className="link-button link-button--analyze"
                                            onClick={() => onGoToAnalysis(mode === 'encrypt' ? result : text, 'caesar')}
                                        >
                                            Analiza
                                        </button>
                                        <RedSpacesToggleButton
                                            enabled={highlightSpaces}
                                            onToggle={() => setHighlightSpaces((prev) => !prev)}
                                        />
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
                                    </div>
                                )}
                            </div>

                            <HighlightedResultBox
                                result={result}
                                cipherPackage={cipherPackage}
                                placeholder="Wynik pojawi się tutaj automatycznie podczas pisania..."
                                highlightSpaces={highlightSpaces}
                            />

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>{cipherPackage.metadata.cipher_type}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Język: <strong>{activeLang.name}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Przesunięcie: <strong>{formatCaesarShift(cipherPackage.metadata.shift, cipherPackage.metadata.mode)}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Alfabet: <strong>{cipherPackage.metadata.alphabet_len} znaków</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    <CaesarShiftVisualizer
                        shift={shift}
                        mode={mode}
                        alphabet={activeLang.alphabet}
                        languageName={activeLang.name}
                    />

                    <StepsVisualization cipherPackage={cipherPackage} />
                </div>
            </div>
        </div>
    );
}

// Moduł 2: Szyfr Vigenère'a
function VigenereSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onGoToAnalysis,
    languages,
    language,
    onLanguageChange,
}) {
    const [mode, setMode] = useState('encrypt');
    const [keyword, setKeyword] = useState('KLUCZ');
    const [activeField, setActiveField] = useState('text'); // 'text' lub 'keyword' dla wirtualnej klawiatury
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(true);

    const activeLang = languages.find((l) => l.code === language) || FALLBACK_LANGUAGES[0];
    const modeConfig = MODES[mode];

    // Gdy użytkownik przełączy język np. na Grecki, ustaw domyślny klucz z tego alfabetu, jeśli obecny nie pasuje
    useEffect(() => {
        const hasValidChar = keyword
            .toUpperCase()
            .split('')
            .some((ch) => activeLang.alphabet.includes(ch));
        if (!hasValidChar && activeLang.alphabet.length >= 4) {
            setKeyword(activeLang.alphabet.slice(0, 4));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    const handleTextChange = (newText) => {
        onTextChange(newText);
        if (!newText.trim()) {
            onCiphertextChange('');
        } else if (mode === 'decrypt') {
            onCiphertextChange(newText, 'vigenere');
        }
    };

    useEffect(() => {
        if (!text.trim() || !keyword.trim()) {
            setResult('');
            setCipherPackage(null);
            setError('');
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
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
                        language: language,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    let errorMsg = 'Serwer zwrócił błąd.';
                    if (errData.detail) {
                        errorMsg = Array.isArray(errData.detail)
                            ? errData.detail.map((e) => e.msg).join(', ')
                            : errData.detail;
                    }
                    setError(errorMsg);
                    return;
                }

                const data = await response.json();
                setResult(data.final_text);
                setCipherPackage(data);
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text, 'vigenere');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                    onCiphertextChange(text, 'vigenere');
                }
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, keyword, mode, language, onCiphertextChange]);

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

    const handleVirtualInsert = (ch) => {
        if (activeField === 'keyword') {
            if (ch !== ' ') setKeyword((prev) => prev + ch.toUpperCase());
        } else {
            handleTextChange(text + ch);
        }
    };

    const handleVirtualBackspace = () => {
        if (activeField === 'keyword') {
            setKeyword((prev) => prev.slice(0, -1));
        } else {
            handleTextChange(text.slice(0, -1));
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
                    Wpisz wiadomość, wybierz język alfabetu i podaj słowo kluczowe, aby obserwować działanie szyfru polialfabetycznego.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="vigenere" />
                </div>
            </header>

            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card">
                        <div className="card-top-bar">
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

                            <CipherLanguageBar
                                languages={languages}
                                selectedLanguage={language}
                                onSelect={onLanguageChange}
                            />
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="vigenere-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    {mode === 'decrypt' && (
                                        <div className="field__header-actions">
                                            <RedSpacesToggleButton
                                                enabled={highlightSpaces}
                                                onToggle={() => setHighlightSpaces((prev) => !prev)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <HighlightableTextarea
                                    id="vigenere-input-text"
                                    className="text-area"
                                    rows={3}
                                    value={text}
                                    onFocus={() => setActiveField('text')}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={modeConfig.inputPlaceholder}
                                    autoComplete="off"
                                    spellCheck={false}
                                    highlightSpaces={mode === 'decrypt' && highlightSpaces}
                                />
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="vigenere-keyword">
                                        Słowo kluczowe (Keyword — {activeLang.name})
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
                                    onFocus={() => setActiveField('keyword')}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Wpisz słowo kluczowe (musi zawierać litery wybranego alfabetu)..."
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <span className="field-hint">
                                    Kliknij w pole tekstu lub klucza, aby pisać na wirtualnej klawiaturze ({activeLang.name}).
                                </span>
                            </div>

                            <VirtualKeyboard
                                languageObj={activeLang}
                                targetLabel={activeField === 'keyword' ? 'Słowo kluczowe' : modeConfig.inputLabel}
                                onInsert={handleVirtualInsert}
                                onBackspace={handleVirtualBackspace}
                            />

                            {error && (
                                <div className="error" role="alert">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="field result">
                            <div className="field__header">
                                <label className="label">
                                    {modeConfig.outputLabel}
                                </label>
                                {result && (
                                    <div className="result__actions">
                                        <button
                                            type="button"
                                            className="link-button link-button--analyze"
                                            onClick={() => onGoToAnalysis(mode === 'encrypt' ? result : text, 'vigenere')}
                                        >
                                            Analiza
                                        </button>
                                        <RedSpacesToggleButton
                                            enabled={highlightSpaces}
                                            onToggle={() => setHighlightSpaces((prev) => !prev)}
                                        />
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
                                    </div>
                                )}
                            </div>

                            <HighlightedResultBox
                                result={result}
                                cipherPackage={cipherPackage}
                                placeholder="Wynik pojawi się tutaj automatycznie podczas pisania..."
                                highlightSpaces={highlightSpaces}
                            />

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>Vigenère</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Język: <strong>{activeLang.name}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Klucz znormalizowany: <strong>{cipherPackage.metadata.keyword}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Długość klucza: <strong>{cipherPackage.metadata.keyword.length}</strong>
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

// Moduł 3: Szyfr Playfair
function PlayfairSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onGoToAnalysis,
    languages,
    language,
    onLanguageChange,
}) {
    const [mode, setMode] = useState('encrypt');
    const [keyword, setKeyword] = useState(DEFAULT_PLAYFAIR_KEYWORD);
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [activeStepIndex, setActiveStepIndex] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(true);

    const modeConfig = MODES[mode];
    const normalizedKeyword = normalizePlayfairKeyword(keyword);
    const effectiveKeyword = getEffectivePlayfairKeyword(keyword);
    const isDefaultKeyword = normalizedKeyword.length === 0;

    const handleTextChange = (newText) => {
        onTextChange(newText);
        if (!newText.trim()) {
            onCiphertextChange('');
        } else if (mode === 'decrypt') {
            onCiphertextChange(newText, 'playfair');
        }
    };

    useEffect(() => {
        if (!text.trim()) {
            setResult('');
            setCipherPackage(null);
            setError('');
            setActiveStepIndex(null);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setError('');
            try {
                const response = await fetch(`/api/v1/playfair/${mode}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        keyword: effectiveKeyword,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    let errorMsg = 'Serwer zwrócił błąd walidacji Playfair.';
                    if (errData.detail) {
                        errorMsg = Array.isArray(errData.detail)
                            ? errData.detail.map((e) => e.msg).join(', ')
                            : errData.detail;
                    }
                    setError(errorMsg);
                    setResult('');
                    setCipherPackage(null);
                    return;
                }

                const data = await response.json();
                setResult(data.final_text);
                setCipherPackage(data);
                setActiveStepIndex(null);
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text, 'playfair');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                }
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, effectiveKeyword, mode, onCiphertextChange]);

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

    // Wykrycie znaków z wejścia pominiętych przez normalizację Playfair (spacje, cyfry, polskie znaki)
    const droppedChars = Array.from(
        new Set(
            text
                .split('')
                .filter((ch) => !/^[A-Za-z]$/.test(ch))
                .map((ch) => (ch === ' ' ? '␣ (spacja)' : ch))
        )
    );

    const matrix1D = cipherPackage?.metadata?.matrix_1d || buildLocalPlayfairMatrix(effectiveKeyword);
    const activeStep = activeStepIndex !== null && cipherPackage?.steps?.[activeStepIndex]
        ? cipherPackage.steps[activeStepIndex]
        : null;

    return (
        <div className="cipher-view-container">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge">Symulator Kryptograficzny</span>
                <h1 className="title">Szyfr Playfair</h1>
                <p className="subtitle">
                    Szyfruj wiadomości parami liter (digramami) w macierzy 5×5 i śledź działanie reguł Wiersza, Kolumny oraz Prostokąta.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="playfair" />
                </div>
            </header>

            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card">
                        <div className="card-top-bar">
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

                            <CipherLanguageBar
                                languages={languages}
                                selectedLanguage={language}
                                onSelect={onLanguageChange}
                                playfairFixed={true}
                            />
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="playfair-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    {mode === 'decrypt' && (
                                        <div className="field__header-actions">
                                            <RedSpacesToggleButton
                                                enabled={highlightSpaces}
                                                onToggle={() => setHighlightSpaces((prev) => !prev)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <HighlightableTextarea
                                    id="playfair-input-text"
                                    className="text-area"
                                    rows={3}
                                    value={text}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={
                                        mode === 'encrypt'
                                            ? 'Wpisz wiadomość (np. SECRET MESSAGE)...'
                                            : 'Wpisz szyfrogram o parzystej liczbie liter A-Z...'
                                    }
                                    autoComplete="off"
                                    spellCheck={false}
                                    highlightSpaces={mode === 'decrypt' && highlightSpaces}
                                />
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="playfair-keyword">
                                        Słowo kluczowe macierzy (Keyword)
                                    </label>
                                    <div className="field__header-actions">
                                        <span
                                            className={`key-limit-badge ${keyword.length >= MAX_PLAYFAIR_KEY_LENGTH ? 'key-limit-badge--limit' : ''}`}
                                            title="Maksymalna długość hasła odpowiada 25 polom macierzy 5×5"
                                        >
                                            {keyword.length} / {MAX_PLAYFAIR_KEY_LENGTH} znaków
                                        </span>
                                        <span
                                            className="shift-value"
                                            title={
                                                isDefaultKeyword
                                                    ? `Pole puste — używany jest domyślny klucz ${DEFAULT_PLAYFAIR_KEYWORD}`
                                                    : `Znormalizowany klucz siatki: ${effectiveKeyword}`
                                            }
                                        >
                                            {isDefaultKeyword ? `DOMYŚLNY: ${DEFAULT_PLAYFAIR_KEYWORD}` : effectiveKeyword}
                                        </span>
                                    </div>
                                </div>
                                <input
                                    id="playfair-keyword"
                                    maxLength={MAX_PLAYFAIR_KEY_LENGTH}
                                    type="text"
                                    className="text-input"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value.slice(0, MAX_PLAYFAIR_KEY_LENGTH))}
                                    placeholder={`Domyślnie: ${DEFAULT_PLAYFAIR_KEYWORD} (wpisz własny klucz siatki 5x5)...`}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <span className="field-hint">
                                    {keyword.length >= MAX_PLAYFAIR_KEY_LENGTH
                                        ? `Osiągnięto limit ${MAX_PLAYFAIR_KEY_LENGTH} znaków dla klucza macierzy 5×5.`
                                        : `Gdy pole jest puste, automatycznie używany jest domyślny klucz ${DEFAULT_PLAYFAIR_KEYWORD}. Powtarzające się litery w parze są rozdzielane znakiem X (lub Q dla XX).`}
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
                                <label className="label">
                                    {modeConfig.outputLabel}
                                </label>
                                {result && (
                                    <div className="result__actions">
                                        <button
                                            type="button"
                                            className="link-button link-button--analyze"
                                            onClick={() => onGoToAnalysis(mode === 'encrypt' ? result : text, 'playfair', 'en')}
                                        >
                                            Analiza
                                        </button>
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
                                    </div>
                                )}
                            </div>

                            <HighlightedResultBox
                                result={result}
                                cipherPackage={cipherPackage}
                                placeholder="Wynik digramów Playfair pojawi się tutaj automatycznie..."
                            />

                            {result && droppedChars.length > 0 && (
                                <div className="unmodified-legend">
                                    <span className="unmodified-legend__dot" />
                                    <span>
                                        Pominięte znaki spoza siatki A–Z:{' '}
                                        <strong style={{ color: 'var(--danger)' }}>{droppedChars.join(', ')}</strong>
                                    </span>
                                </div>
                            )}

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>Playfair (5×5)</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Klucz siatki:{' '}
                                        <strong>
                                            {cipherPackage.metadata.keyword || DEFAULT_PLAYFAIR_KEYWORD}
                                            {isDefaultKeyword ? ' (domyślny)' : ''}
                                        </strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Liczba par: <strong>{cipherPackage.steps.length}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    <section className="shift-visualizer" aria-label="Macierz 5x5 Szyfru Playfair">
                        <div className="shift-visualizer__header">
                            <div>
                                <h3 className="shift-visualizer__title">
                                    Wizualizacja Macierzy Klucza Playfair (5×5)
                                </h3>
                                <p className="shift-visualizer__subtitle">
                                    Najedź kursorem lub kliknij dowolną kartę digramu poniżej, aby podświetlić parę wejściową i wyjściową w siatce.
                                </p>
                            </div>
                            <div className="shift-visualizer__controls">
                                <span className="shift-indicator-pill">
                                    Klucz siatki: <strong>{effectiveKeyword}{isDefaultKeyword ? ' (domyślny)' : ''}</strong>
                                </span>
                                <span className="shift-indicator-pill">
                                    Zasada: <strong>I = J (25 komórek)</strong>
                                </span>
                            </div>
                        </div>

                        <div className="playfair-matrix-layout">
                            <div className="playfair-grid" role="grid" aria-label="Siatka 5 na 5">
                                {matrix1D.map((char, idx) => {
                                    const r = Math.floor(idx / 5);
                                    const c = idx % 5;

                                    const isInput1 = activeStep && activeStep.operation_details.pos1[0] === r && activeStep.operation_details.pos1[1] === c;
                                    const isInput2 = activeStep && activeStep.operation_details.pos2[0] === r && activeStep.operation_details.pos2[1] === c;
                                    const isOutputChar = activeStep && (activeStep.output_char[0] === char || activeStep.output_char[1] === char);

                                    let cellClass = 'playfair-cell';
                                    if (isInput1 || isInput2) cellClass += ' playfair-cell--input';
                                    else if (isOutputChar) cellClass += ' playfair-cell--output';

                                    return (
                                        <div key={`${char}-${idx}`} className={cellClass} role="gridcell">
                                            <span className="playfair-cell__char">{char === 'I' ? 'I/J' : char}</span>
                                            <span className="playfair-cell__coord">{r + 1},{c + 1}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="playfair-rules-legend">
                                <h4>Jak działają 3 reguły Playfair?</h4>
                                <ul>
                                    <li>
                                        <strong>1. Ten sam wiersz:</strong> Zastąp każdą literę sąsiadem z prawej (przy deszyfrowaniu: z lewej), zawijając wiersz.
                                    </li>
                                    <li>
                                        <strong>2. Ta sama kolumna:</strong> Zastąp każdą literę sąsiadem poniżej (przy deszyfrowaniu: powyżej), zawijając kolumnę.
                                    </li>
                                    <li>
                                        <strong>3. Prostokąt:</strong> Litery leżą w różnych wierszach i kolumnach — zamień każdą literę na róg prostokąta leżący w tym samym wierszu.
                                    </li>
                                </ul>
                                {activeStep && (
                                    <div className="hovered-match-badge" style={{ marginTop: '10px' }}>
                                        Aktywny digram #{activeStepIndex + 1}: <strong>{activeStep.input_char}</strong> → <strong>{activeStep.output_char}</strong> ({activeStep.operation_details.rule_applied})
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <StepsVisualization
                        cipherPackage={cipherPackage}
                        activeStepIndex={activeStepIndex}
                        onStepHover={setActiveStepIndex}
                    />
                </div>
            </div>
        </div>
    );
}

// Główny komponent aplikacji
export default function App() {
    const [currentView, setCurrentView] = useState('home');
    const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
    const [selectedLanguage, setSelectedLanguage] = useState('pl');
    const [caesarText, setCaesarText] = useState('');
    const [vigenereText, setVigenereText] = useState('');
    const [playfairText, setPlayfairText] = useState('');
    const [sharedCiphertext, setSharedCiphertext] = useState('');
    const [sharedCipherOrigin, setSharedCipherOrigin] = useState('caesar');
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

    useEffect(() => {
        fetch('/api/v1/languages')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.languages?.length) {
                    setLanguages(data.languages);
                    if (data.default) {
                        setSelectedLanguage(data.default);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const handleSharedCipherUpdate = (newCiphertext, origin = 'caesar') => {
        setSharedCiphertext(newCiphertext);
        if (origin) setSharedCipherOrigin(origin);
    };

    const handleJumpToAnalysis = (ciphertextToAnalyze, originCipher, forcedLang = null) => {
        setSharedCiphertext(ciphertextToAnalyze);
        setSharedCipherOrigin(originCipher);
        if (forcedLang) {
            setSelectedLanguage(forcedLang);
        }
        setCurrentView('cryptanalysis');
    };

    return (
        <div className="app">
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
                        Kryptoanaliza
                    </button>
                    <button
                        type="button"
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-pressed={theme === 'light'}
                        title={theme === 'light' ? 'Przełącz na motyw ciemny' : 'Przełącz na motyw jasny'}
                    >
                        <span>{theme === 'light' ? 'Motyw ciemny' : 'Motyw jasny'}</span>
                    </button>
                </div>
            </nav>

            {currentView === 'home' && (
                <main className="dashboard-container">
                    <div className="dashboard-hero">
                        <span className="badge">Akademia Kryptografii</span>
                        <h1 className="hero-title">Wybierz moduł i rozpocznij naukę</h1>
                        <p className="hero-subtitle">
                            Interaktywne laboratorium algorytmów szyfrujących. Eksperymentuj z wieloma językami, analizuj wykresy i łam szyfry z pomocą modeli NLTK.
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

            {currentView === 'caesar' && (
                <CaesarSimulator
                    onBack={() => setCurrentView('home')}
                    text={caesarText}
                    onTextChange={setCaesarText}
                    onCiphertextChange={handleSharedCipherUpdate}
                    onGoToAnalysis={handleJumpToAnalysis}
                    languages={languages}
                    language={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    theme={theme}
                />
            )}

            {currentView === 'vigenere' && (
                <VigenereSimulator
                    onBack={() => setCurrentView('home')}
                    text={vigenereText}
                    onTextChange={setVigenereText}
                    onCiphertextChange={handleSharedCipherUpdate}
                    onGoToAnalysis={handleJumpToAnalysis}
                    languages={languages}
                    language={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    theme={theme}
                />
            )}

            {currentView === 'playfair' && (
                <PlayfairSimulator
                    onBack={() => setCurrentView('home')}
                    text={playfairText}
                    onTextChange={setPlayfairText}
                    onCiphertextChange={handleSharedCipherUpdate}
                    onGoToAnalysis={handleJumpToAnalysis}
                    languages={languages}
                    language={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    theme={theme}
                />
            )}

            {currentView === 'cryptanalysis' && (
                <CryptanalysisView
                    onBack={() => setCurrentView('home')}
                    initialCiphertext={sharedCiphertext}
                    initialCipherOrigin={sharedCipherOrigin}
                    languages={languages}
                    language={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    theme={theme}
                />
            )}

            <footer className="footer">
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}
