import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const POLISH_ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';

const POLISH_NATURAL_FREQUENCIES = {
    A: 8.91, Ą: 0.99, B: 1.47, C: 3.96, Ć: 0.40, D: 3.25, E: 7.66, Ę: 1.11,
    F: 0.30, G: 1.42, H: 1.08, I: 8.21, J: 2.28, K: 3.51, L: 2.10, Ł: 1.82,
    M: 2.80, N: 5.52, Ń: 0.20, O: 7.75, Ó: 0.85, P: 3.13, R: 4.69, S: 4.32,
    Ś: 0.66, T: 3.98, U: 2.50, W: 4.65, Y: 3.76, Z: 5.64, Ź: 0.06, Ż: 0.83,
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

    let interpretation = '';
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

export default function CryptanalysisView({
    onBack,
    initialCiphertext = '',
    onOpenNotes,
}) {
    const [cipherText, setCipherText] = useState(initialCiphertext);
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bruteForceData, setBruteForceData] = useState(null);
    const [bruteForceLoading, setBruteForceLoading] = useState(false);
    const [error, setError] = useState('');
    const [shiftDelta, setShiftDelta] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

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

    useEffect(() => {
        shiftDeltaRef.current = shiftDelta;
    }, [shiftDelta]);

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

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Szyfrogram (%)',
                        data: shiftedCipherFrequencies,
                        backgroundColor: 'rgba(99, 102, 241, 0.85)',
                        borderColor: '#818cf8',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 1,
                    },
                    {
                        label: 'Naturalny Język Polski (%) [Tło]',
                        data: naturalFrequencies,
                        backgroundColor: 'rgba(148, 163, 184, 0.35)',
                        borderColor: 'rgba(148, 163, 184, 0.65)',
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
                            color: '#f8fafc',
                            font: { size: 13, weight: '600', family: 'Inter, system-ui, sans-serif' },
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            padding: 16,
                        },
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#334155',
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
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#cbd5e1', font: { size: 12, weight: '600' } },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Częstotliwość występowania (%)', color: '#94a3b8', font: { size: 12 } },
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
    }, [analysisData]);

    // Płynna aktualizacja danych wykresu po zmianie przesunięcia (shiftDelta) bez przeładowywania canvas
    useEffect(() => {
        if (!chartInstanceRef.current || !analysisData) return;
        const len = POLISH_ALPHABET.length;
        const normDelta = ((shiftDelta % len) + len) % len;
        const shiftedCipherFrequencies = analysisData.frequencies.map((_, i) => {
            const origIdx = (i - normDelta + len) % len;
            return analysisData.frequencies[origIdx].frequency;
        });

        chartInstanceRef.current.data.datasets[0].data = shiftedCipherFrequencies;
        chartInstanceRef.current.update('none');
    }, [shiftDelta, analysisData]);

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
                        <span className="char-count-badge">
                            Znaków: <strong>{cipherText.length}</strong>
                        </span>
                    </div>

                    <textarea
                        id="crypto-ciphertext-input"
                        className="text-area crypto-textarea"
                        rows={4}
                        value={cipherText}
                        onChange={(e) => setCipherText(e.target.value)}
                        placeholder="Wklej tutaj zaszyfrowany tekst (np. Szyfr Cezara lub Vigenère'a)..."
                        autoComplete="off"
                        spellCheck={false}
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
                                    {bruteForceData.attempts.map((attempt) => (
                                        <tr key={attempt.shift} className="brute-force-row">
                                            <td className="brute-force-cell-key">
                                                <span className="key-pill">+{attempt.shift}</span>
                                            </td>
                                            <td className="brute-force-cell-result">
                                                {attempt.decrypted_text}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {analysisData && (
                    <div className="analysis-results-section">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-card__title">Zbadane litery alfabetu</span>
                                <span className="stat-card__value">{analysisData.total_letters}</span>
                                <span className="stat-card__desc">Tylko znaki polskiego alfabetu</span>
                            </div>
                        </div>

                        <div className="chart-wrapper">
                            <div className="chart-header">
                                <div>
                                    <h3 className="chart-title">Wykres Częstotliwości Liter vs Język Naturalny</h3>
                                    <span className="chart-legend-badge">
                                        Fiolet = Szyfrogram | Szary = Polski Język Naturalny
                                    </span>
                                </div>
                            </div>

                            {/* Pasek kontroli przesuwania wykresu i wskaźnik Delta */}
                            <div className="chart-shift-bar">
                                <div className="shift-badge-box">
                                    <span className="shift-badge-label">Przesunięcie wykresu:</span>
                                    <span className={`delta-badge ${shiftDelta !== 0 ? 'delta-badge--active' : ''}`}>
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
                                className={`chart-canvas-container ${isDragging ? 'chart-canvas-container--dragging' : ''}`}
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
