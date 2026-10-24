import { useState } from 'react';
import './App.css';

// Keys match the backend endpoints: POST /api/v1/caesar/{mode}
const MODES = {
    encrypt: {
        tab: 'Szyfrowanie',
        inputLabel: 'Tekst jawny (Plaintext)',
        inputPlaceholder: 'Wpisz wiadomość do zaszyfrowania...',
        outputLabel: 'Szyfrogram (Ciphertext)',
        action: 'Zaszyfruj wiadomość',
        shiftSign: '+',
    },
    decrypt: {
        tab: 'Deszyfrowanie',
        inputLabel: 'Szyfrogram (Ciphertext)',
        inputPlaceholder: 'Wpisz szyfrogram do odszyfrowania...',
        outputLabel: 'Tekst jawny (Plaintext)',
        action: 'Odszyfruj wiadomość',
        shiftSign: '-',
    },
};

export default function App() {
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

    // Feeds the result back as input in the opposite mode, so a round trip can be checked
    const handleUseResult = () => {
        setText(result);
        switchMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
    };

    const handleSubmit = async () => {
        setError('');
        setResult('');
        setLoading(true);

        try {
            const response = await fetch(`/api/v1/caesar/${mode}`, {
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
            setResult(data.final_text);
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

    return (
        <div className="app">
            <header className="header">
                <span className="badge">Symulator Kryptograficzny</span>
                <h1 className="title">Szyfr Cezara</h1>
                <p className="subtitle">
                    Eksperymentuj z tekstem i kluczem, aby zobaczyć, jak działa kryptoanaliza klasyczna.
                </p>
            </header>

            <main className="card">
                <div className="mode-switch" role="group" aria-label="Tryb">
                    {Object.entries(MODES).map(([key, config]) => (
                        <button
                            key={key}
                            type="button"
                            className="mode-switch__option"
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
                        <label className="label" htmlFor="input-text">
                            {modeConfig.inputLabel}
                        </label>
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
                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={handleSubmit}
                        disabled={loading}
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

            <footer className="footer">
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}
