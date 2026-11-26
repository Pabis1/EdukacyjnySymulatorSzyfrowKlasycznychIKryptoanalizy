import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import HighlightableTextarea from './HighlightableTextarea';
import RedSpacesToggleButton from './RedSpacesToggleButton';
import SpellcheckToggleButton from './SpellcheckToggleButton';

const POLISH_ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';

const POLISH_NATURAL_FREQUENCIES = {
    A: 8.91, 'Ą': 0.99, B: 1.47, C: 3.96, 'Ć': 0.40, D: 3.25, E: 7.66, 'Ę': 1.11,
    F: 0.30, G: 1.42, H: 1.08, I: 8.21, J: 2.28, K: 3.51, L: 2.10, 'Ł': 1.82,
    M: 2.80, N: 5.52, 'Ń': 0.20, O: 7.75, 'Ó': 0.85, P: 3.13, R: 4.69, S: 4.32,
    'Ś': 0.66, T: 3.98, U: 2.50, W: 4.65, Y: 3.76, Z: 5.64, 'Ź': 0.06, 'Ż': 0.83,
};

function computeLocalFrequencyAnalysis(text) {
    const counts = {};
    let totalLetters = 0;

    for (const ch of text.toUpperCase()) {
        if (POLISH_ALPHABET.includes(ch)) {
            counts[ch] = (counts[ch] || 0) + 1;
            totalLetters += 1;
        }
    }

    const frequencies = POLISH_ALPHABET.split('').map((letter) => {
        const count = counts[letter] || 0;
        const frequency = totalLetters > 0 ? Number(((count / totalLetters) * 100).toFixed(2)) : 0;
        return {
            letter,
            count,
            frequency,
            natural_frequency: POLISH_NATURAL_FREQUENCIES[letter] || 0,
        };
    });

    let ioc = 0;
    if (totalLetters > 1) {
        const sumF = Object.values(counts).reduce((acc, c) => acc + c * (c - 1), 0);
        ioc = Number((sumF / (totalLetters * (totalLetters - 1))).toFixed(4));
    }

    let interpretation;
    if (totalLetters < 30) {
        interpretation = 'Zbyt krótka próbka tekstu, aby wnioskować o strukturze szyfru (zalecane min. 50-100 liter).';
    } else if (ioc >= 0.055) {
        interpretation = `Wysoki indeks koincydencji (${ioc.toFixed(4)} ~ język polski ~0.060). Wskazuje na tekst jawny lub szyfr monoalfabetyczny (np. Szyfr Cezara).`;
    } else {
        interpretation = `Niski / spłaszczony indeks koincydencji (${ioc.toFixed(4)}). Rozkład jest bardziej jednorodny, co jest typowe dla szyfrów polialfabetycznych (np. Szyfr Vigenère'a).`;
    }

    return {
        total_letters: totalLetters,
        frequencies,
        index_of_coincidence: ioc,
        interpretation,
        isLocalFallback: true,
    };
}

function computeLocalCaesarBruteForce(text) {
    const len = POLISH_ALPHABET.length;
    const attempts = [];

    for (let shift = 1; shift < len; shift += 1) {
        let decrypted = '';
        for (const char of text) {
            const upper = char.toUpperCase();
            const idx = POLISH_ALPHABET.indexOf(upper);
            if (idx === -1) {
                decrypted += char;
            } else {
                const newCharUpper = POLISH_ALPHABET[(idx - shift + len) % len];
                decrypted += char === upper ? newCharUpper : newCharUpper.toLowerCase();
            }
        }
        attempts.push({ shift, decrypted_text: decrypted });
    }

    return {
        alphabet: 'pl',
        alphabet_len: len,
        attempts,
        isLocalFallback: true,
    };
}

function computeBestFrequencyMatch(analysisData) {
    if (!analysisData?.frequencies?.length || analysisData.total_letters < 15) {
        return {
            hasReliableMatch: false,
            bestDelta: null,
            detectedCaesarKey: null,
            bestSimilarity: 0,
            similarities: [],
        };
    }

    const len = POLISH_ALPHABET.length;
    const cipherFreqs = analysisData.frequencies.map((f) => f.frequency);
    const naturalFreqs = analysisData.frequencies.map((f) => f.natural_frequency || 0);
    const naturalNorm = Math.sqrt(naturalFreqs.reduce((acc, v) => acc + v * v, 0));

    if (naturalNorm === 0) {
        return {
            hasReliableMatch: false,
            bestDelta: null,
            detectedCaesarKey: null,
            bestSimilarity: 0,
            similarities: [],
        };
    }

    const similarities = [];
    for (let delta = 0; delta < len; delta += 1) {
        let dot = 0;
        let shiftedSq = 0;
        for (let i = 0; i < len; i += 1) {
            const origIdx = (i - delta + len) % len;
            const val = cipherFreqs[origIdx];
            dot += val * naturalFreqs[i];
            shiftedSq += val * val;
        }
        const denom = Math.sqrt(shiftedSq) * naturalNorm;
        const cos = denom > 0 ? dot / denom : 0;
        similarities.push({ delta, cos });
    }

    const sorted = [...similarities].sort((a, b) => b.cos - a.cos);
    const best = sorted[0];
    const secondBest = sorted[1] || { cos: 0 };
    const gap = best.cos - secondBest.cos;
    const hasReliableMatch =
        (best.cos >= 0.85 && gap >= 0.065) ||
        (best.cos >= 0.76 && gap >= 0.11);

    return {
        hasReliableMatch,
        bestDelta: best.delta,
        detectedCaesarKey: (len - best.delta) % len,
        bestSimilarity: best.cos,
        similarities: similarities.map((s) => s.cos),
    };
}

function getChartPalette(theme, isMatched) {
    const isLight = theme === 'light';
    return {
        barBg: isMatched
            ? (isLight ? 'rgba(5, 150, 105, 0.85)' : 'rgba(16, 185, 129, 0.85)')
            : (isLight ? 'rgba(79, 70, 229, 0.85)' : 'rgba(99, 102, 241, 0.85)'),
        barBorder: isMatched
            ? (isLight ? '#047857' : '#34d399')
            : (isLight ? '#4338ca' : '#818cf8'),
        naturalBg: isLight ? 'rgba(100, 116, 139, 0.25)' : 'rgba(148, 163, 184, 0.35)',
        naturalBorder: isLight ? 'rgba(100, 116, 139, 0.55)' : 'rgba(148, 163, 184, 0.65)',
        legendColor: isLight ? '#0f172a' : '#f8fafc',
        tooltipBg: isLight ? '#ffffff' : '#1e293b',
        tooltipTitle: isLight ? '#0f172a' : '#f8fafc',
        tooltipBody: isLight ? '#334155' : '#cbd5e1',
        tooltipBorder: isLight ? '#cbd5e1' : '#334155',
        xGrid: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)',
        xTicks: isLight ? '#334155' : '#cbd5e1',
        yGrid: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        yTicks: isLight ? '#475569' : '#94a3b8',
    };
}

export default function CryptanalysisView({
    onBack,
    initialCiphertext = '',
    onOpenNotes,
    theme = 'dark',
}) {
    const [cipherText, setCipherText] = useState(initialCiphertext);
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bruteForceData, setBruteForceData] = useState(null);
    const [bruteForceLoading, setBruteForceLoading] = useState(false);
    const [error, setError] = useState('');
    const [shiftDelta, setShiftDelta] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(false);

    const matchAnalysis = useMemo(
        () => computeBestFrequencyMatch(analysisData),
        [analysisData],
    );
    const currentNormDelta = ((shiftDelta % POLISH_ALPHABET.length) + POLISH_ALPHABET.length) % POLISH_ALPHABET.length;
    const isMatched = Boolean(matchAnalysis.hasReliableMatch && currentNormDelta === matchAnalysis.bestDelta);

    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const dragStartXRef = useRef(0);
    const dragStartDeltaRef = useRef(0);

    const handleAnalyze = async () => {
        if (!cipherText.trim()) {
            setError('Wklej lub wpisz tekst szyfrogramu do analizy.');
            setAnalysisData(null);
            return;
        }

        setLoading(true);
        setError('');
        setShiftDelta(0);

        try {
            const response = await fetch('/api/v1/cryptanalysis/frequency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cipherText }),
            });

            if (response.status === 404 || response.status === 405) {
                setAnalysisData(computeLocalFrequencyAnalysis(cipherText));
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let msg = 'Wystąpił błąd podczas analizy.';
                if (errData.detail) msg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
                setError(msg);
                return;
            }

            const data = await response.json();
            setAnalysisData({ ...data, isLocalFallback: false });
        } catch {
            setAnalysisData(computeLocalFrequencyAnalysis(cipherText));
        } finally {
            setLoading(false);
        }
    };

    const runBruteForce = async () => {
        if (!cipherText.trim()) {
            setError('Wklej lub wpisz tekst szyfrogramu przed uruchomieniem ataku Brute Force.');
            setBruteForceData(null);
            return;
        }

        setBruteForceLoading(true);
        setError('');

        try {
            const response = await fetch('/api/v1/cryptanalysis/caesar-brute-force', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: cipherText,
                    alphabet: 'pl',
                }),
            });

            if (response.status === 404 || response.status === 405) {
                setBruteForceData(computeLocalCaesarBruteForce(cipherText));
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let msg = 'Wystąpił błąd podczas ataku Brute Force.';
                if (errData.detail) msg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
                setError(msg);
                return;
            }

            const data = await response.json();
            setBruteForceData({ ...data, isLocalFallback: false });
        } catch {
            setBruteForceData(computeLocalCaesarBruteForce(cipherText));
        } finally {
            setBruteForceLoading(false);
        }
    };

    const handleBruteForceClick = () => {
        runBruteForce();
    };

    // Synchronizacja z zewnętrznie przekazanym szyfrogramem (np. z symulatora lub notatek)
    useEffect(() => {
        setCipherText(initialCiphertext);
        setShiftDelta(0);
        if (!initialCiphertext.trim()) return;

        let isMounted = true;
        fetch('/api/v1/cryptanalysis/frequency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: initialCiphertext }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!isMounted) return;
                if (data) {
                    setAnalysisData({ ...data, isLocalFallback: false });
                } else {
                    setAnalysisData(computeLocalFrequencyAnalysis(initialCiphertext));
                }
            })
            .catch(() => {
                if (isMounted) setAnalysisData(computeLocalFrequencyAnalysis(initialCiphertext));
            });

        return () => { isMounted = false; };
    }, [initialCiphertext]);

    // Obsługa przeciągania myszą w osi X
    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartDeltaRef.current = shiftDelta;
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const diffX = e.clientX - dragStartXRef.current;
        const pxPerLetter = 22;
        const deltaChange = Math.trunc(diffX / pxPerLetter);
        setShiftDelta(dragStartDeltaRef.current + deltaChange);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Obsługa przeciągania dotykowego na ekranach dotykowych
    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length === 1) {
            setIsDragging(true);
            dragStartXRef.current = e.touches[0].clientX;
            dragStartDeltaRef.current = shiftDelta;
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || !e.touches || e.touches.length !== 1) return;
        const diffX = e.touches[0].clientX - dragStartXRef.current;
        const pxPerLetter = 22;
        const deltaChange = Math.trunc(diffX / pxPerLetter);
        setShiftDelta(dragStartDeltaRef.current + deltaChange);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const shiftDeltaRef = useRef(shiftDelta);
    const isMatchedRef = useRef(isMatched);

    useEffect(() => {
        shiftDeltaRef.current = shiftDelta;
        isMatchedRef.current = isMatched;
    }, [shiftDelta, isMatched]);

    // Tworzenie lub niszczenie instancji Chart.js
    useEffect(() => {
        if (!analysisData || !canvasRef.current) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const labels = analysisData.frequencies.map((f) => f.letter);
        const naturalFrequencies = analysisData.frequencies.map((f) => f.natural_frequency);

        const len = POLISH_ALPHABET.length;
        const currentShift = shiftDeltaRef.current;
        const normDelta = ((currentShift % len) + len) % len;
        const shiftedCipherFrequencies = analysisData.frequencies.map((_, i) => {
            const origIdx = (i - normDelta + len) % len;
            return analysisData.frequencies[origIdx].frequency;
        });

        const palette = getChartPalette(theme, isMatchedRef.current);

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Szyfrogram (%)',
                        data: shiftedCipherFrequencies,
                        backgroundColor: palette.barBg,
                        borderColor: palette.barBorder,
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 1,
                    },
                    {
                        label: 'Naturalny Język Polski (%) [Tło]',
                        data: naturalFrequencies,
                        backgroundColor: palette.naturalBg,
                        borderColor: palette.naturalBorder,
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: palette.legendColor,
                            font: { size: 13, weight: '600', family: 'Inter, system-ui, sans-serif' },
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            padding: 16,
                        },
                    },
                    tooltip: {
                        backgroundColor: palette.tooltipBg,
                        titleColor: palette.tooltipTitle,
                        bodyColor: palette.tooltipBody,
                        borderColor: palette.tooltipBorder,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const datasetLabel = context.dataset.label || '';
                                const value = context.parsed.y;
                                if (context.datasetIndex === 0) {
                                    const alphabetLen = POLISH_ALPHABET.length;
                                    const activeShift = shiftDeltaRef.current;
                                    const currentNormDelta = ((activeShift % alphabetLen) + alphabetLen) % alphabetLen;
                                    const origIndex = (context.dataIndex - currentNormDelta + alphabetLen) % alphabetLen;
                                    const origLetter = POLISH_ALPHABET[origIndex];
                                    const count = analysisData.frequencies[origIndex]?.count || 0;
                                    if (activeShift !== 0) {
                                        return `${datasetLabel}: ${value}% (${count} wystąpień litery ${origLetter}, przesunięcie Δ = ${activeShift > 0 ? '+' : ''}${activeShift})`;
                                    }
                                    return `${datasetLabel}: ${value}% (${count} wystąpień)`;
                                }
                                return `${datasetLabel}: ${value}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: palette.xGrid },
                        ticks: { color: palette.xTicks, font: { size: 12, weight: '600' } },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: palette.yGrid },
                        ticks: { color: palette.yTicks },
                        title: { display: true, text: 'Częstotliwość występowania (%)', color: palette.yTicks, font: { size: 12 } },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [analysisData, theme]);

    // Płynna aktualizacja danych wykresu i podświetlenia po zmianie przesunięcia (shiftDelta) bez przeładowywania canvas
    useEffect(() => {
        if (!chartInstanceRef.current || !analysisData) return;
        const len = POLISH_ALPHABET.length;
        const normDelta = ((shiftDelta % len) + len) % len;
        const shiftedCipherFrequencies = analysisData.frequencies.map((_, i) => {
            const origIdx = (i - normDelta + len) % len;
            return analysisData.frequencies[origIdx].frequency;
        });

        const palette = getChartPalette(theme, isMatched);
        const dataset = chartInstanceRef.current.data.datasets[0];
        dataset.data = shiftedCipherFrequencies;
        dataset.backgroundColor = palette.barBg;
        dataset.borderColor = palette.barBorder;
        chartInstanceRef.current.update('none');
    }, [shiftDelta, analysisData, isMatched, theme]);

    return (
        <div className="cryptanalysis-page">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge badge--crypto">Laboratorium Kryptoanalizy</span>
                <h1 className="title">Kryptoanaliza / Łamanie Szyfrów</h1>
                <p className="subtitle">
                    Wizualna analiza częstotliwościowa liter w szyfrogramie oraz automatyczne łamanie szyfru Cezara metodą Brute Force.
                </p>
            </header>

            <main className="card cryptanalysis-card">
                <div className="field">
                    <div className="field__header">
                        <label className="label" htmlFor="crypto-ciphertext-input">
                            Szyfrogram do zbadania (Ciphertext)
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
                            <span className="char-count-badge">
                                Znaków: <strong>{cipherText.length}</strong>
                            </span>
                        </div>
                    </div>

                    <HighlightableTextarea
                        id="crypto-ciphertext-input"
                        className="text-area crypto-textarea"
                        rows={4}
                        value={cipherText}
                        onChange={(e) => setCipherText(e.target.value)}
                        placeholder="Wklej tutaj zaszyfrowany tekst (np. Szyfr Cezara lub Vigenère'a)..."
                        autoComplete="off"
                        spellCheck={spellCheckEnabled}
                        highlightSpaces={highlightSpaces}
                    />
                </div>

                <div className="analysis-action-bar">
                    <button
                        type="button"
                        className="primary-button analyze-btn"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? 'Analizuję na serwerze...' : 'Analizuj Szyfrogram'}
                    </button>
                    <button
                        type="button"
                        className="secondary-button brute-force-btn"
                        onClick={handleBruteForceClick}
                        disabled={bruteForceLoading}
                    >
                        {bruteForceLoading ? 'Łamanie szyfru...' : 'Złam (Cezar - Brute Force)'}
                    </button>
                    {onOpenNotes && (
                        <button
                            type="button"
                            className="secondary-button notes-nav-shortcut-btn"
                            onClick={onOpenNotes}
                            title="Otwórz panel zarządzania notatkami i zapisanymi szyfrogramami"
                        >
                            Zarządzanie notatkami / wykresami →
                        </button>
                    )}
                    <span className="analysis-hint">
                        Analiza statystyk lub test wszystkich możliwych przesunięć przez API.
                    </span>
                </div>

                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}

                {bruteForceData && (
                    <section className="brute-force-section" aria-label="Wyniki ataku Brute Force dla szyfru Cezara">
                        <div className="brute-force-header">
                            <div>
                                <h3 className="brute-force-title">
                                    Wyniki Brute Force — Szyfr Cezara (31 możliwości)
                                </h3>
                                <p className="brute-force-subtitle">
                                    Przejrzyj tabelę poniżej i oceń, dla którego klucza odszyfrowany tekst ma sens w języku naturalnym.
                                </p>
                            </div>
                        </div>

                        <div className="brute-force-table-wrapper">
                            <table className="brute-force-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="brute-force-th-key">Klucz</th>
                                        <th scope="col" className="brute-force-th-result">Wynik</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bruteForceData.attempts.map((attempt) => {
                                        const isBestBruteForceMatch =
                                            matchAnalysis.hasReliableMatch &&
                                            attempt.shift === matchAnalysis.detectedCaesarKey;
                                        return (
                                            <tr
                                                key={attempt.shift}
                                                className={`brute-force-row brute-force-row--clickable ${
                                                    isBestBruteForceMatch ? 'brute-force-row--matched' : ''
                                                }`}
                                                onClick={() => {
                                                    if (analysisData) {
                                                        setShiftDelta(-attempt.shift);
                                                    }
                                                }}
                                                title={analysisData ? `Kliknij, aby ustawić wykres na przesunięcie dla klucza +${attempt.shift}` : undefined}
                                            >
                                                <td className="brute-force-cell-key">
                                                    <span className="key-pill">+{attempt.shift}</span>
                                                </td>
                                                <td className="brute-force-cell-result">
                                                    {attempt.decrypted_text}
                                                    {isBestBruteForceMatch && (
                                                        <span className="brute-force-match-badge">
                                                            ✓ Najlepsze dopasowanie
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {analysisData && (
                    <div className="analysis-results-section">
                        <div className={`chart-wrapper ${isMatched ? 'chart-wrapper--matched' : ''}`}>
                            <div className="chart-header">
                                <div>
                                    <h3 className="chart-title">Wykres Częstotliwości Liter vs Język Naturalny</h3>
                                    <span className={`chart-legend-badge ${isMatched ? 'chart-legend-badge--matched' : ''}`}>
                                        {isMatched
                                            ? 'Zielony = Poprawne dopasowanie! | Szary = Polski Język Naturalny'
                                            : 'Fiolet = Szyfrogram | Szary = Polski Język Naturalny'}
                                    </span>
                                </div>
                                {isMatched && (
                                    <span className="match-status-pill" role="status">
                                        {matchAnalysis.detectedCaesarKey === 0
                                            ? '✓ Znaleziono poprawne dopasowanie (tekst jawny / klucz 0)'
                                            : `✓ Znaleziono poprawne dopasowanie! Klucz Cezara: +${matchAnalysis.detectedCaesarKey}`}
                                    </span>
                                )}
                            </div>

                            {/* Pasek kontroli przesuwania wykresu i wskaźnik Delta */}
                            <div className="chart-shift-bar">
                                <div className="shift-badge-box">
                                    <span className="shift-badge-label">Przesunięcie wykresu:</span>
                                    <span className={`delta-badge ${shiftDelta !== 0 ? 'delta-badge--active' : ''} ${isMatched ? 'delta-badge--matched' : ''}`}>
                                        Δ = {shiftDelta > 0 ? `+${shiftDelta}` : shiftDelta}
                                    </span>
                                    <span className="shift-units-text">
                                        ({Math.abs(shiftDelta)} {Math.abs(shiftDelta) === 1 ? 'pozycja' : 'pozycji'}
                                        {shiftDelta === 0 ? '' : shiftDelta > 0 ? ' w prawo' : ' w lewo'})
                                    </span>
                                </div>

                                <div className="shift-actions">
                                    <button
                                        type="button"
                                        className="shift-btn"
                                        onClick={() => setShiftDelta((d) => d - 1)}
                                        title="Przesuń wykres o 1 pozycję w lewo"
                                    >
                                        ← W lewo (-1)
                                    </button>
                                    <button
                                        type="button"
                                        className="shift-btn"
                                        onClick={() => setShiftDelta((d) => d + 1)}
                                        title="Przesuń wykres o 1 pozycję w prawo"
                                    >
                                        W prawo (+1) →
                                    </button>
                                    {shiftDelta !== 0 && (
                                        <button
                                            type="button"
                                            className="shift-reset-btn"
                                            onClick={() => setShiftDelta(0)}
                                            title="Powrót do pierwotnej pozycji (Delta = 0)"
                                        >
                                            Zresetuj (Δ = 0)
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="chart-drag-tip">
                                Przeciągaj wykres myszą w poziomie (oś X) lub użyj przycisków, aby nałożyć na siebie słupki i porównać je „na oko”.
                            </p>

                            <div
                                className={`chart-canvas-container ${isDragging ? 'chart-canvas-container--dragging' : ''} ${isMatched ? 'chart-canvas-container--matched' : ''}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                title="Kliknij i przeciągnij w poziomie, aby przesunąć wykres częstotliwości"
                            >
                                <canvas ref={canvasRef} aria-label="Wykres słupkowy częstotliwości liter" />
                            </div>
                        </div>

                        <div className="crypto-edu-guide">
                            <h4>Jak czytać ten wykres?</h4>
                            <div className="edu-guide-columns">
                                <div className="edu-guide-col">
                                    <h5>Szyfr Cezara (monoalfabetyczny)</h5>
                                    <p>
                                        Słupek naturalny i słupek szyfrogramu mają podobny kształt (wyraźne maksima dla samogłosek), ale cały profil jest <strong>przesunięty w bok</strong> o wartość stałego klucza. Przesuń wykres w osi X tak, aby dopasować fioletowe piki do szarych słupków języka polskiego – wartość wskaźnika Delta ujawni klucz!
                                    </p>
                                </div>
                                <div className="edu-guide-col">
                                    <h5>Szyfr Vigenère’a (polialfabetyczny)</h5>
                                    <p>
                                        Wielokrotne stosowanie różnych przesunięć powoduje tzw. <em>spłaszczenie rozkładu</em>. Fioletowe słupki mają zbliżone wysokości i nie pokrywają się z charakterystycznym profilem języka polskiego, a przesuwanie wykresu nie przynosi wyraźnego dopasowania maksimów.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
