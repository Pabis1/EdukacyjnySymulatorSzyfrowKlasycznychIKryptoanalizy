import React, { useEffect, useState } from 'react';
import CipherHistoryInfo from './CipherHistoryInfo';
import HighlightableTextarea from './HighlightableTextarea';
import PlayfairMatrixVisualizer from './PlayfairMatrixVisualizer';
import RedSpacesToggleButton from './RedSpacesToggleButton';
import SpellcheckToggleButton from './SpellcheckToggleButton';
import { generatePlayfairMatrix } from '../utils/playfair';

const MAX_PLAYFAIR_KEY_LENGTH = 25;

const MODES = {
    encrypt: {
        tab: 'Szyfrowanie',
        inputLabel: 'Tekst jawny (Plaintext)',
        inputPlaceholder: 'Wpisz tekst do zaszyfrowania (np. HELLO WORLD)...',
        outputLabel: 'Szyfrogram (Ciphertext)',
        actionName: 'Zaszyfruj',
    },
    decrypt: {
        tab: 'Deszyfrowanie',
        inputLabel: 'Szyfrogram (Ciphertext)',
        inputPlaceholder: 'Wpisz szyfrogram do odszyfrowania (parzysta liczba liter, bez spacji)...',
        outputLabel: 'Tekst jawny (Plaintext)',
        actionName: 'Odszyfruj',
    },
};

function localPlayfairProcess(text, keyword, mode) {
    const { matrixChars, grid } = generatePlayfairMatrix(keyword);

    // Mapowania pozycji
    const charToPos = {};
    const posToChar = {};
    for (let r = 0; r < 5; r += 1) {
        for (let c = 0; c < 5; c += 1) {
            const ch = grid[r][c];
            charToPos[ch] = [r, c];
            posToChar[`${r},${c}`] = ch;
        }
    }

    const clean = (text || '').toUpperCase().replaceAll('J', 'I').replace(/[^A-Z]/g, '');

    const fillerFor = (ch) => (ch === 'X' ? 'Q' : 'X');

    let pairs = [];
    if (mode === 'encrypt') {
        let i = 0;
        while (i < clean.length) {
            const c1 = clean[i];
            if (i + 1 < clean.length) {
                const c2 = clean[i + 1];
                if (c1 === c2) {
                    pairs.push(c1 + fillerFor(c1));
                    i += 1;
                } else {
                    pairs.push(c1 + c2);
                    i += 2;
                }
            } else {
                pairs.push(c1 + fillerFor(c1));
                i += 1;
            }
        }
    } else {
        if (clean.length % 2 !== 0) {
            throw new Error('Szyfrogram Playfair musi mieć parzystą liczbę liter.');
        }
        for (let i = 0; i < clean.length; i += 2) {
            const pair = clean.slice(i, i + 2);
            if (pair[0] === pair[1]) {
                throw new Error('Szyfrogram Playfair nie może zawierać digramu z dwiema takimi samymi literami.');
            }
            pairs.push(pair);
        }
    }

    const shift = mode === 'encrypt' ? 1 : -1;
    const steps = [];
    const resultChars = [];

    for (let idx = 0; idx < pairs.length; idx += 1) {
        const pair = pairs[idx];
        const [r1, c1] = charToPos[pair[0]];
        const [r2, c2] = charToPos[pair[1]];

        let rule = '';
        let out1 = '';
        let out2 = '';

        if (r1 === r2) {
            rule = 'Wiersz';
            const nc1 = (c1 + shift + 5) % 5;
            const nc2 = (c2 + shift + 5) % 5;
            out1 = posToChar[`${r1},${nc1}`];
            out2 = posToChar[`${r2},${nc2}`];
        } else if (c1 === c2) {
            rule = 'Kolumna';
            const nr1 = (r1 + shift + 5) % 5;
            const nr2 = (r2 + shift + 5) % 5;
            out1 = posToChar[`${nr1},${c1}`];
            out2 = posToChar[`${nr2},${c2}`];
        } else {
            rule = 'Prostokąt';
            out1 = posToChar[`${r1},${c2}`];
            out2 = posToChar[`${r2},${c1}`];
        }

        resultChars.push(out1, out2);
        steps.push({
            index: idx * 2,
            input_char: pair,
            output_char: out1 + out2,
            description: `Digram '${pair}': Reguła '${rule}' -> '${out1}${out2}'.`,
            operation_details: {
                is_modified: true,
                rule_applied: rule,
                pos1: [r1, c1],
                pos2: [r2, c2],
            },
        });
    }

    return {
        final_text: resultChars.join(''),
        steps,
        metadata: {
            cipher_type: 'Playfair',
            mode,
            keyword: keyword.toUpperCase().replaceAll('J', 'I').replace(/[^A-Z]/g, ''),
            matrix_1d: matrixChars,
        },
    };
}

export default function PlayfairSimulator({
    onBack,
    text,
    onTextChange,
    onCiphertextChange,
    onTransferToAnalysis,
    onSaveToNotes,
}) {
    const [mode, setMode] = useState('encrypt');
    const [keyword, setKeyword] = useState('MONARCHY');
    const [result, setResult] = useState('');
    const [cipherPackage, setCipherPackage] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [hoveredStepIdx, setHoveredStepIdx] = useState(null);
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(false);

    const modeConfig = MODES[mode];

    const handleKeywordChange = (value) => {
        setKeyword(value.slice(0, MAX_PLAYFAIR_KEY_LENGTH));
    };

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
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setError('');

            try {
                const response = await fetch(`/api/v1/playfair/${mode}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        keyword,
                    }),
                    signal: controller.signal,
                });

                if (response.status === 404 || response.status === 405) {
                    try {
                        const localData = localPlayfairProcess(text, keyword, mode);
                        setResult(localData.final_text);
                        setCipherPackage(localData);
                        onCiphertextChange(mode === 'encrypt' ? localData.final_text : text);
                    } catch (localErr) {
                        setError(localErr.message || 'Błąd przetwarzania szyfru Playfair.');
                    }
                    return;
                }

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
                onCiphertextChange(mode === 'encrypt' ? data.final_text : text);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    try {
                        const localData = localPlayfairProcess(text, keyword, mode);
                        setResult(localData.final_text);
                        setCipherPackage(localData);
                        onCiphertextChange(mode === 'encrypt' ? localData.final_text : text);
                    } catch (localErr) {
                        setError(localErr.message || 'Nie udało się połączyć z serwerem ani przetworzyć tekstu lokalnie.');
                    }
                }
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

    const activePair = hoveredStepIdx !== null && cipherPackage?.steps?.[hoveredStepIdx]
        ? cipherPackage.steps[hoveredStepIdx].input_char
        : null;

    return (
        <div className="cipher-view-container">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge badge--crypto">Szyfr Digraficzny</span>
                <h1 className="title">Szyfr Playfair</h1>
                <p className="subtitle">
                    Wpisz hasło i obserwuj, jak litery układają się w siatce 5×5. Szyfr operuje na digramach (parach liter) według geometrycznych reguł wiersza, kolumny i prostokąta.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <CipherHistoryInfo cipherType="playfair" />
                </div>
            </header>

            <div className="cipher-content-layout">
                <div className="cipher-content-layout__main">
                    <main className="card playfair-card">
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

                        {/* Sekcja klucza: pole na hasło i obok niego dynamicznie renderująca się tabelka 5x5 */}
                        <div className="playfair-key-section">
                            <div className="playfair-key-controls">
                                <div className="field">
                                    <div className="field__header">
                                        <label className="label" htmlFor="playfair-keyword-input">
                                            Hasło / Słowo kluczowe (Keyword)
                                        </label>
                                        <div className="field__header-actions">
                                            <span
                                                className={`key-limit-badge ${keyword.length >= MAX_PLAYFAIR_KEY_LENGTH ? 'key-limit-badge--limit' : ''}`}
                                                title="Maksymalna długość hasła odpowiada 25 polom macierzy 5×5"
                                            >
                                                {keyword.length} / {MAX_PLAYFAIR_KEY_LENGTH} znaków
                                            </span>
                                            <span className="shift-value">
                                                {keyword ? keyword.toUpperCase().replaceAll('J', 'I') : 'Brak'}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        id="playfair-keyword-input"
                                        type="text"
                                        className="text-input playfair-keyword-input"
                                        value={keyword}
                                        maxLength={MAX_PLAYFAIR_KEY_LENGTH}
                                        onChange={(e) => handleKeywordChange(e.target.value)}
                                        placeholder="Wpisz hasło klucza (np. MONARCHY, KRYPTO)..."
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    <span className={`field-hint ${keyword.length >= MAX_PLAYFAIR_KEY_LENGTH ? 'field-hint--limit' : ''}`}>
                                        {keyword.length >= MAX_PLAYFAIR_KEY_LENGTH
                                            ? `Osiągnięto limit ${MAX_PLAYFAIR_KEY_LENGTH} znaków dla klucza macierzy 5×5.`
                                            : `Maksymalnie ${MAX_PLAYFAIR_KEY_LENGTH} znaków (siatka 5×5). Powtórzone litery są automatycznie pomijane, a litera J jest zamieniana na I.`}
                                    </span>
                                </div>

                                <div className="key-normalization-info">
                                    <div className="norm-stat-pill">
                                        <span>Znormalizowany klucz:</span>
                                        <strong>
                                            {keyword ? keyword.toUpperCase().replaceAll('J', 'I').replace(/[^A-Z]/g, '') || '(pusty)' : '(pusty)'}
                                        </strong>
                                    </div>
                                    <div className="norm-stat-pill">
                                        <span>Reguła alfabetu:</span>
                                        <span>25 znaków (I/J razem)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamicznie renderująca się tabelka 5x5 obok pola na hasło */}
                            <div className="playfair-matrix-column">
                                <PlayfairMatrixVisualizer
                                    keyword={keyword}
                                    activePair={activePair}
                                />
                            </div>
                        </div>

                        <div className="controls">
                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="playfair-input-text">
                                        {modeConfig.inputLabel}
                                    </label>
                                    <div className="field__header-actions">
                                        <RedSpacesToggleButton
                                            enabled={highlightSpaces}
                                            onToggle={() => setHighlightSpaces((prev) => !prev)}
                                        />
                                        <SpellcheckToggleButton
                                            enabled={spellCheckEnabled}
                                            onToggle={() => setSpellCheckEnabled((prev) => !prev)}
                                        />
                                    </div>
                                </div>
                                <HighlightableTextarea
                                    id="playfair-input-text"
                                    className="text-area"
                                    rows={4}
                                    value={text}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    placeholder={modeConfig.inputPlaceholder}
                                    autoComplete="off"
                                    spellCheck={spellCheckEnabled}
                                    highlightSpaces={highlightSpaces}
                                />
                            </div>

                            {error && (
                                <div className="error" role="alert">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="field result">
                            <div className="field__header">
                                <label className="label" htmlFor="playfair-result-text">
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
                                                        title: `Szyfr Playfair (${modeConfig.tab}, hasło ${keyword})`,
                                                        cipherType: 'Szyfr Playfair',
                                                        content: result,
                                                        notes: `Zapisano z symulatora Playfair. Hasło klucza: "${keyword}". Wejście: "${text.slice(0, 45)}${text.length > 45 ? '...' : ''}".`,
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
                            <HighlightableTextarea
                                id="playfair-result-text"
                                className="text-area text-area--result"
                                rows={4}
                                readOnly
                                spellCheck={false}
                                value={result}
                                placeholder="Wynik pojawi się tutaj automatycznie podczas wprowadzania tekstu..."
                                highlightSpaces={highlightSpaces}
                            />

                            {cipherPackage?.metadata && (
                                <div className="metadata-bar">
                                    <span className="metadata-badge">
                                        Szyfr: <strong>Playfair</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Klucz: <strong>{cipherPackage.metadata.keyword || 'BRAK'}</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Siatka: <strong>5×5 (25 liter)</strong>
                                    </span>
                                    <span className="metadata-badge">
                                        Tryb: <strong>{modeConfig.tab}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* Wizualizacja kroków digramowych */}
                    {cipherPackage?.steps && cipherPackage.steps.length > 0 && (
                        <section className="steps-container" aria-label="Wizualizacja przekształceń digramów">
                            <div className="steps-header">
                                <div>
                                    <h2 className="steps-title">Przekształcenia digramów (par liter) krok po kroku</h2>
                                    <p className="steps-subtitle">
                                        Najedź kursor na krok, aby podświetlić litery pary w macierzy 5×5.
                                    </p>
                                </div>
                                <div className="steps-stats">
                                    <span className="stat-chip">
                                        Digramy: <strong>{cipherPackage.steps.length}</strong>
                                    </span>
                                    <span className="stat-chip stat-chip--modified">
                                        Litery wyniku: <strong>{cipherPackage.steps.length * 2}</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="steps-list">
                                {cipherPackage.steps.map((step, idx) => {
                                    const rule = step.operation_details?.rule_applied || 'Transformacja';
                                    const isHovered = hoveredStepIdx === idx;
                                    return (
                                        <div
                                            key={step.index ?? idx}
                                            className={`step-card step-card--modified ${isHovered ? 'step-card--hovered' : ''}`}
                                            onMouseEnter={() => setHoveredStepIdx(idx)}
                                            onMouseLeave={() => setHoveredStepIdx(null)}
                                        >
                                            <div className="step-card__header">
                                                <span className="step-card__index">Para #{idx + 1}</span>
                                                <span className="step-card__status step-card__status--mod">
                                                    {rule}
                                                </span>
                                            </div>

                                            <div className="step-card__chars">
                                                <div className="char-box">
                                                    <span className="char-box__label">Wejście</span>
                                                    <span className="char-box__val">{step.input_char}</span>
                                                </div>
                                                <span className="step-card__arrow">→</span>
                                                <div className="char-box">
                                                    <span className="char-box__label">Wyjście</span>
                                                    <span className="char-box__val">{step.output_char}</span>
                                                </div>
                                            </div>

                                            <div className="step-card__details">
                                                <div className="detail-row">
                                                    <span>Reguła:</span>
                                                    <strong>{rule}</strong>
                                                </div>
                                                <p className="step-card-rule-desc">
                                                    {rule === 'Wiersz' && 'Litery w tym samym wierszu – przesunięcie w poziomie.'}
                                                    {rule === 'Kolumna' && 'Litery w tej samej kolumnie – przesunięcie w pionie.'}
                                                    {rule === 'Prostokąt' && 'Litery w przeciwległych rogach prostokąta – zamiana kolumn.'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
