import { useEffect, useState } from 'react';
import './App.css';


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
        id: 'affine',
        name: 'Szyfr Afiniczny',
        category: 'Kryptografia Matematyczna',
        badge: 'Zaawansowany',
        description: 'Szyfr łączący operacje mnożenia i dodawania modulo alfabetu.',
        icon: '',
        available: false,
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
                        Szczegółowe dane z paczki odpowiedzi dla każdego znaku tekstu.
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
                                <div className="step-card__chars">
                                    <span className="char-badge input-char" title="Znak wejściowy">
                                        {step.input_char === ' ' ? '␣' : step.input_char}
                                    </span>
                                    <span className="step-card__arrow">→</span>
                                    <span className="char-badge output-char" title="Znak wyjściowy">
                                        {step.output_char === ' ' ? '␣' : step.output_char}
                                    </span>
                                </div>
                                <span
                                    className={`status-pill ${
                                        isMod ? 'status-pill--modified' : 'status-pill--unmodified'
                                    }`}
                                >
                                    {isMod ? 'Przesunięty' : 'Niezmieniony'}
                                </span>
                            </div>

                            <div className="step-card__details">
                                {isMod ? (
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


function CaesarSimulator({ onBack }) {
    const [mode, setMode] = useState('encrypt');
    const [text, setText] = useState('');
    const [shift, setShift] = useState(3);
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const modeConfig = MODES[mode];

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
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                }
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, shift, mode]);

    const handleUseResult = () => {
        setText(result);
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
        <>
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge">Symulator Kryptograficzny (Na żywo)</span>
                <h1 className="title">Szyfr Cezara</h1>
                <p className="subtitle">
                    Wpisz tekst i ustaw przesunięcie, aby natychmiast zobaczyć wynik i matematyczną analizę krok po kroku.
                </p>
            </header>

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
                        <label className="label" htmlFor="caesar-input-text">
                            {modeConfig.inputLabel}
                        </label>
                        <textarea
                            id="caesar-input-text"
                            className="text-area"
                            rows={3}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={modeConfig.inputPlaceholder}
                            autoComplete="off"
                            spellCheck={false}
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

                    <div className="live-status">
                        <span
                            className={`live-dot ${
                                loading
                                    ? 'live-dot--loading'
                                    : text.trim()
                                    ? 'live-dot--active'
                                    : ''
                            }`}
                        />
                        <span className="live-text">
                            {loading
                                ? 'Przetwarzanie na żywo...'
                                : text.trim()
                                ? 'Wynik aktualizowany na żywo'
                                : 'Wpisz tekst powyżej, aby zobaczyć wynik na żywo'}
                        </span>
                    </div>

                    {error && (
                        <div className="error" role="alert">
                            ⚠️ {error}
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
                                    {copied ? '✓ Skopiowano!' : 'Kopiuj'}
                                </button>
                            </div>
                        )}
                    </div>
                    <textarea
                        id="caesar-result-text"
                        className="text-area text-area--result"
                        rows={3}
                        readOnly
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

            <StepsVisualization cipherPackage={cipherPackage} />
        </>
    );
}

// Moduł 2: Szyfr Vigenère'a na żywo
function VigenereSimulator({ onBack }) {
    const [mode, setMode] = useState('encrypt');
    const [text, setText] = useState('');
    const [keyword, setKeyword] = useState('KLUCZ');
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const modeConfig = MODES[mode];

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
                // Wykorzystanie paczki danych z kontraktu API Vigenère
                setResult(data.final_text);
                setCipherPackage(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Nie udało się połączyć z serwerem.');
                }
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [text, keyword, mode]);

    const handleUseResult = () => {
        setText(result);
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
        <>
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge">Symulator Kryptograficzny (Na żywo)</span>
                <h1 className="title">Szyfr Vigenère’a</h1>
                <p className="subtitle">
                    Wpisz wiadomość i słowo kluczowe, aby obserwować działanie szyfru polialfabetycznego w czasie rzeczywistym.
                </p>
            </header>

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
                        <label className="label" htmlFor="vigenere-input-text">
                            {modeConfig.inputLabel}
                        </label>
                        <textarea
                            id="vigenere-input-text"
                            className="text-area"
                            rows={3}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={modeConfig.inputPlaceholder}
                            autoComplete="off"
                            spellCheck={false}
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

                    <div className="live-status">
                        <span
                            className={`live-dot ${
                                loading
                                    ? 'live-dot--loading'
                                    : text.trim() && keyword.trim()
                                    ? 'live-dot--active'
                                    : ''
                            }`}
                        />
                        <span className="live-text">
                            {loading
                                ? 'Przetwarzanie na żywo...'
                                : text.trim() && keyword.trim()
                                ? 'Wynik aktualizowany na żywo'
                                : 'Wpisz tekst i klucz, aby zobaczyć wynik na żywo'}
                        </span>
                    </div>

                    {error && (
                        <div className="error" role="alert">
                            ⚠️ {error}
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
                                    {copied ? '✓ Skopiowano!' : 'Kopiuj'}
                                </button>
                            </div>
                        )}
                    </div>
                    <textarea
                        id="vigenere-result-text"
                        className="text-area text-area--result"
                        rows={3}
                        readOnly
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
        </>
    );
}

// Główny komponent aplikacji
export default function App() {
    const [currentView, setCurrentView] = useState('home');

    return (
        <div className="app">
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
                </div>
            </nav>

            {/* Widok: Strona Główna / Dashboard */}
            {currentView === 'home' && (
                <main className="dashboard-container">
                    <div className="dashboard-hero">
                        <span className="badge">Akademia Kryptografii</span>
                        <h1 className="hero-title">Wybierz moduł i rozpocznij naukę</h1>
                        <p className="hero-subtitle">
                            Interaktywne laboratorium algorytmów szyfrujących. Eksperymentuj, analizuj i poznawaj tajniki bezpieczeństwa danych w czasie rzeczywistym.
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
                                    {cipher.available ? 'Uruchom symulator na żywo →' : 'Niedostępne'}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}

            {/* Widok: Symulator Cezara */}
            {currentView === 'caesar' && (
                <CaesarSimulator onBack={() => setCurrentView('home')} />
            )}

            {/* Widok: Symulator Vigenère'a */}
            {currentView === 'vigenere' && (
                <VigenereSimulator onBack={() => setCurrentView('home')} />
            )}

            <footer className="footer">
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}
