import { useState } from 'react';
import './App.css';

// Lista dostępnych modułów na platformie
const CIPHER_MODULES = [
    {
        id: 'caesar',
        name: 'Szyfr Cezara',
        category: 'Kryptografia Klasyczna',
        badge: 'Podstawowy',
        description: 'Klasyczny szyfr podstawieniany przesuwający litery o stałą wartość klucza. Idealny punkt startowy.',
        available: true,
    },
    {
        id: 'vigenere',
        name: 'Szyfr Vigenère’a',
        category: 'Kryptografia Klasyczna',
        badge: 'Średniozaawansowany',
        description: 'Polialfabetyczny szyfr oparty na słowie kluczowym, który zrewolucjonizował renesansową kryptografię.',
        available: false, // W przygotowaniu
    },
    {
        id: 'affine',
        name: 'Szyfr Afiniczny',
        category: 'Kryptografia Matematyczna',
        badge: 'Zaawansowany',
        description: 'Szyfr łączący operacje mnożenia i dodawania modulo alfabetu.',
        available: false, // W przygotowaniu
    },
];

const MODES = {
    encrypt: {
        tab: 'Szyfrowanie',
        inputLabel: 'Tekst jawny (Plaintext)',
        inputPlaceholder: 'Wpisz wiadomość do zaszyfrowania...',
        outputLabel: 'Szyfrogram (Ciphertext)',
        action: 'Zaszyfruj wiadomość',
        shiftSign: '+',
        formula: (s) => `E(x) = (x + ${s}) mod 26`,
    },
    decrypt: {
        tab: 'Deszyfrowanie',
        inputLabel: 'Szyfrogram (Ciphertext)',
        inputPlaceholder: 'Wpisz szyfrogram do odszyfrowania...',
        outputLabel: 'Tekst jawny (Plaintext)',
        action: 'Odszyfruj wiadomość',
        shiftSign: '-',
        formula: (s) => `D(x) = (x - ${s}) mod 26`,
    },
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function App() {
    // Stan zarządzający widokiem: 'home' (strona główna) lub 'caesar' (symulator)
    const [currentView, setCurrentView] = useState('home');

    // Stany symulatora Cezara
    const [mode, setMode] = useState('encrypt');
    const [text, setText] = useState('');
    const [shift, setShift] = useState(3);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const modeConfig = MODES[mode];

    const switchMode = (newMode) => {
        setMode(newMode);
        setResult('');
        setError('');
    };

    const handleUseResult = () => {
        setText(result);
        switchMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
    };

    const handleSubmit = async () => {
        setError('');
        setResult('');
        setLoading(true);

        try {
            const response = await fetch(`http://localhost:8000/api/v1/caesar/${mode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    shift: Number(shift)
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let errorMsg = 'Serwer zwrócił błąd.';
                if (errData.detail) {
                    if (Array.isArray(errData.detail)) {
                        errorMsg = errData.detail.map(e => e.msg).join(', ');
                    } else {
                        errorMsg = errData.detail;
                    }
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

            const data = await response.json();
            setResult(data.final_text || data.ciphertext || data.result || data.text || '');
        } catch {
            setError('Nie udało się połączyć z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const previewShift = Number(shift) % 26;
    const getShiftedChar = (charIndex) => {
        if (mode === 'encrypt') {
            return ALPHABET[(charIndex + previewShift) % 26];
        } else {
            return ALPHABET[(charIndex - previewShift + 26) % 26];
        }
    };

    return (
        <div className="edu-app">
            {/* Górny pasek nawigacyjny */}
            <nav className="edu-navbar">
                <div className="edu-logo" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
                    <span className="logo-icon"></span>
                    <span className="logo-text">Symulator<strong> Edukacyjny</strong></span>
                    <span className="logo-badge"></span>
                </div>
                <div className="edu-nav-links">
                    <button
                        type="button"
                        className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
                        onClick={() => setCurrentView('home')}
                    >
                         Strona Główna
                    </button>
                </div>
            </nav>

            {/* WIDOK 1: STRONA GŁÓWNA / DASHBOARD */}
            {currentView === 'home' ? (
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
                            >
                                <div className="cipher-card__header">
                                    <span className="cipher-icon">{cipher.icon}</span>
                                    <span className={`cipher-badge ${cipher.available ? 'active' : 'locked'}`}>
                                        {cipher.available ? cipher.badge : 'Wkrótce '}
                                    </span>
                                </div>
                                <span className="cipher-category">{cipher.category}</span>
                                <h3 className="cipher-name">{cipher.name}</h3>
                                <p className="cipher-desc">{cipher.description}</p>
                                <div className="cipher-action">
                                    {cipher.available ? 'Uruchom symulator →' : 'Niedostępne'}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            ) : (
                /* WIDOK 2: SYMULATOR SZYFRU CEZARA */
                <>
                    <div className="back-bar">
                        <button type="button" className="back-btn" onClick={() => setCurrentView('home')}>
                            ← Wróć do menu głównego
                        </button>
                    </div>

                    <header className="header">
                        <span className="badge">Moduł Kryptoanalizy</span>
                        <h1 className="title">Szyfr Cezara</h1>
                        <p className="subtitle">
                            Eksperymentuj z tekstem i kluczem, aby zobaczyć, jak działa kryptoanaliza klasyczna.
                        </p>
                    </header>

                    <div className="edu-container">
                        <main className="card">
                            <div className="mode-switch" role="group" aria-label="Tryb">
                                {Object.entries(MODES).map(([key, config]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`mode-switch__option ${mode === key ? 'active' : ''}`}
                                        onClick={() => switchMode(key)}
                                        disabled={loading}
                                        aria-pressed={mode === key}
                                    >
                                        {config.tab}
                                    </button>
                                ))}
                            </div>

                            <div className="controls">
                                <div className="field">
                                    <div className="field__header">
                                        <label className="label" htmlFor="input-text">
                                            {modeConfig.inputLabel}
                                        </label>
                                        <span className="char-count">{text.length} znaków</span>
                                    </div>
                                    <textarea
                                        id="input-text"
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
                                        <label className="label" htmlFor="shift">
                                            Klucz przesunięcia
                                        </label>
                                        <span className="shift-value">
                                            {modeConfig.shiftSign}{shift}
                                        </span>
                                    </div>
                                    <input
                                        id="shift"
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

                                    <div className="formula-box">
                                        <span className="formula-label">Wzór:</span>
                                        <code>{modeConfig.formula(shift)}</code>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={handleSubmit}
                                    disabled={loading || !text.trim()}
                                >
                                    {loading ? 'Przetwarzanie...' : modeConfig.action}
                                </button>

                                {error && (
                                    <div className="error" role="alert">
                                        ⚠️ {error}
                                    </div>
                                )}
                            </div>

                            <div className="field result">
                                <div className="field__header">
                                    <label className="label" htmlFor="result-text">
                                        {modeConfig.outputLabel}
                                    </label>
                                    {result && (
                                        <div className="result__actions">
                                            <button type="button" className="link-button" onClick={handleUseResult}>
                                                Użyj wyniku
                                            </button>
                                            <button type="button" className="link-button" onClick={handleCopy}>
                                                {copied ? '✓ Skopiowano!' : 'Kopiuj'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    id="result-text"
                                    className="text-area text-area--result"
                                    rows={3}
                                    readOnly
                                    value={result}
                                    placeholder="Wynik pojawi się tutaj..."
                                />
                            </div>
                        </main>

                        <aside className="edu-sidebar">
                            <div className="sidebar-card">
                                <h3 className="sidebar-title"> Podgląd Przesunięcia Liter</h3>
                                <p className="sidebar-desc">Zobacz zmianę pierwszych liter alfabetu przy wybranym kluczu:</p>

                                <div className="alphabet-preview">
                                    {['A', 'B', 'C', 'D', 'E'].map((char, index) => (
                                        <div key={char} className="preview-box">
                                            <span className="src-char">{char}</span>
                                            <span className="arrow">↓</span>
                                            <span className="dst-char">{getShiftedChar(index)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="sidebar-card info-card">
                                <h3 className="sidebar-title"> Kącik Edukacyjny</h3>
                                <p className="sidebar-text">
                                    Szyfr Cezara to przykład szyfru monoalfabetycznego. Każda litera tekstu jawnego jest zastępowana zawsze tą samą literą szyfrogramu.
                                </p>
                            </div>
                        </aside>
                    </div>
                </>
            )}

            <footer className="footer">
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}