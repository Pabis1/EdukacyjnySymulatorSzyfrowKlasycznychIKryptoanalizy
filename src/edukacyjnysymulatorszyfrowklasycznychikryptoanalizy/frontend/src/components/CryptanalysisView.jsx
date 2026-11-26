import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const DEFAULT_LANGUAGES = [
    { code: 'pl', name: 'Polski', alphabet: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ', alphabet_len: 32 },
    { code: 'en', name: 'English', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphabet_len: 26 },
    { code: 'de', name: 'Deutsch', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', alphabet_len: 29 },
    { code: 'es', name: 'Español', alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', alphabet_len: 27 },
    { code: 'el', name: 'Ελληνικά', alphabet: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', alphabet_len: 24 },
];

const NATURAL_FREQUENCIES = {
    pl: {
        A: 8.91, Ą: 0.99, B: 1.47, C: 3.96, Ć: 0.40, D: 3.25, E: 7.66, Ę: 1.11,
        F: 0.30, G: 1.42, H: 1.08, I: 8.21, J: 2.28, K: 3.51, L: 2.10, Ł: 1.82,
        M: 2.80, N: 5.52, Ń: 0.20, O: 7.75, Ó: 0.85, P: 3.13, R: 4.69, S: 4.32,
        Ś: 0.66, T: 3.98, U: 2.50, W: 4.65, Y: 3.76, Z: 5.64, Ź: 0.06, Ż: 0.83,
    },
    en: {
        A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.70, F: 2.23, G: 2.02, H: 6.09,
        I: 6.97, J: 0.15, K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51, P: 1.93,
        Q: 0.10, R: 5.99, S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15,
        Y: 1.97, Z: 0.07,
    },
    de: {
        A: 6.51, B: 1.89, C: 3.06, D: 5.08, E: 16.40, F: 1.66, G: 3.01, H: 4.58,
        I: 6.55, J: 0.27, K: 1.42, L: 3.44, M: 2.53, N: 9.78, O: 2.59, P: 0.67,
        Q: 0.02, R: 7.00, S: 7.27, T: 6.15, U: 4.17, V: 0.85, W: 1.92, X: 0.03,
        Y: 0.04, Z: 1.13, Ä: 0.58, Ö: 0.44, Ü: 0.99,
    },
    es: {
        A: 11.53, B: 2.22, C: 4.02, D: 5.01, E: 12.18, F: 0.69, G: 1.77, H: 0.70,
        I: 6.25, J: 0.49, K: 0.02, L: 4.97, M: 3.16, N: 6.71, Ñ: 0.31, O: 8.68,
        P: 2.51, Q: 0.88, R: 6.87, S: 7.98, T: 4.63, U: 2.93, V: 1.14, W: 0.02,
        X: 0.22, Y: 1.01, Z: 0.47,
    },
    el: {
        Α: 12.20, Β: 0.76, Γ: 1.63, Δ: 1.69, Ε: 9.43, Ζ: 0.33, Η: 4.79, Θ: 1.18,
        Ι: 9.58, Κ: 3.97, Λ: 2.65, Μ: 3.42, Ν: 6.26, Ξ: 0.44, Ο: 9.74, Π: 4.21,
        Ρ: 4.35, Σ: 7.45, Τ: 7.95, Υ: 4.04, Φ: 0.79, Χ: 1.29, Ψ: 0.16, Ω: 1.69,
    },
};

const CIPHER_TYPES = [
    { id: 'caesar', label: 'Szyfr Cezara (Brute Force aktywny)' },
    { id: 'vigenere', label: 'Szyfr Vigenère’a (Tylko analiza wykresu / IoC)' },
    { id: 'playfair', label: 'Szyfr Playfair (Tylko analiza wykresu / IoC)' },
];

// Poniżej tej pewności zwycięzcy rankingu pokazujemy ostrzeżenie, że wynik jest niepewny.
// Próg wpływa tylko na komunikat — same prawdopodobieństwa pochodzą wprost z softmaxu backendu.
const VERDICT_CONFIDENCE = 0.8;

// Wiersz hipotezy "to nie jest Cezar" wstawiany do rankingu obok przesunięć (ten sam softmax).
function buildRankingRows(bruteForceData) {
    const rows = bruteForceData.candidates.map((cand) => ({ ...cand, isNotCaesar: false }));
    const pNotCaesar = bruteForceData.not_caesar_probability;
    if (bruteForceData.isLocalFallback || typeof pNotCaesar !== 'number') {
        return rows;
    }
    const insertAt = rows.findIndex((row) => row.probability < pNotCaesar);
    const notCaesarRow = { shift: null, text: null, probability: pNotCaesar, isNotCaesar: true };
    rows.splice(insertAt === -1 ? rows.length : insertAt, 0, notCaesarRow);
    return rows;
}

function ProbabilityCell({ probability, danger = false }) {
    const pct = (probability * 100).toFixed(2);
    return (
        <div className="prob-cell">
            <span className={`prob-text ${danger ? 'prob-text--danger' : ''}`}>{pct}%</span>
            <div className="prob-bar-track">
                <div
                    className={`prob-bar-fill ${danger ? 'prob-bar-fill--danger' : ''}`}
                    style={{ width: `${Math.min(100, Math.max(2, Number(pct)))}%` }}
                />
            </div>
        </div>
    );
}

function computeLocalFrequencyAnalysis(text, langInfo) {
    const alphabetStr = langInfo.alphabet;
    const natFreqs = NATURAL_FREQUENCIES[langInfo.code] || NATURAL_FREQUENCIES.pl;
    const counts = {};
    let totalLetters = 0;

    for (const ch of text.toUpperCase()) {
        if (alphabetStr.includes(ch)) {
            counts[ch] = (counts[ch] || 0) + 1;
            totalLetters += 1;
        }
    }

    const frequencies = alphabetStr.split('').map((letter) => {
        const count = counts[letter] || 0;
        const frequency = totalLetters > 0 ? Number(((count / totalLetters) * 100).toFixed(2)) : 0;
        return {
            letter,
            count,
            frequency,
            natural_frequency: natFreqs[letter] ?? Number((100 / alphabetStr.length).toFixed(2)),
        };
    });

    let ioc = 0;
    if (totalLetters > 1) {
        const sumF = Object.values(counts).reduce((acc, c) => acc + c * (c - 1), 0);
        ioc = Number((sumF / (totalLetters * (totalLetters - 1))).toFixed(4));
    }

    let interpretation = '';
    if (totalLetters < 25) {
        interpretation = 'Krótka próbka tekstu — przy mniejszej liczbie znaków wspomóż się przyciskiem Brute Force z modelem NLTK (dla Cezara) lub przesuwaniem skokowym wykresu.';
    } else if (ioc >= 0.052) {
        interpretation = `Wysoki indeks koincydencji (${ioc.toFixed(4)}). Wskazuje na tekst jawny lub szyfr monoalfabetyczny (np. Szyfr Cezara). Użyj przycisków skoku pod wykresem, aby dopasować fioletowe słupki do szarego tła!`;
    } else {
        interpretation = `Niski / spłaszczony indeks koincydencji (${ioc.toFixed(4)}). Rozkład jest bardziej jednorodny, co jest typowe dla szyfrów polialfabetycznych (Szyfr Vigenère'a) lub digraficznych (Szyfr Playfair).`;
    }

    return {
        total_letters: totalLetters,
        frequencies,
        index_of_coincidence: ioc,
        interpretation,
    };
}

function decryptWithShiftLocally(text, shift, alphabetStr) {
    if (!shift) return text;
    const len = alphabetStr.length;
    let out = '';
    for (const ch of text) {
        const upper = ch.toUpperCase();
        const idx = alphabetStr.indexOf(upper);
        if (idx === -1) {
            out += ch;
        } else {
            const newCharUpper = alphabetStr[(idx - (shift % len) + len) % len];
            out += ch === upper ? newCharUpper : newCharUpper.toLowerCase();
        }
    }
    return out;
}

function computeLocalCaesarBruteForce(text, langInfo) {
    const alphabetStr = langInfo.alphabet;
    const len = alphabetStr.length;
    const candidates = [];

    for (let shift = 1; shift < len; shift += 1) {
        candidates.push({
            shift,
            text: decryptWithShiftLocally(text, shift, alphabetStr),
            probability: null,
        });
    }

    return {
        language: langInfo.code,
        alphabet_len: len,
        candidates,
        isLocalFallback: true,
    };
}

export default function CryptanalysisView({
    onBack,
    initialCiphertext = '',
    initialCipherOrigin = 'caesar',
    languages = DEFAULT_LANGUAGES,
    language = 'pl',
    onLanguageChange,
}) {
    const [cipherText, setCipherText] = useState(initialCiphertext);
    const [selectedCipherType, setSelectedCipherType] = useState(initialCipherOrigin || 'caesar');
    const [vkUpper, setVkUpper] = useState(true);
    const [vkOpen, setVkOpen] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);
    const [bruteForceData, setBruteForceData] = useState(null);
    const [bruteForceLoading, setBruteForceLoading] = useState(false);
    const [chartShift, setChartShift] = useState(0);
    const [error, setError] = useState('');
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const activeLangInfo = useMemo(
        () => languages.find((l) => l.code === language) || DEFAULT_LANGUAGES[0],
        [languages, language]
    );

    const isBruteForceBlocked = selectedCipherType === 'vigenere' || selectedCipherType === 'playfair';
    const maxShift = Math.max(1, activeLangInfo.alphabet.length - 1);

    // Jeśli wybrano Vigenere lub Playfair, czyścimy ewentualną wcześniejszą tabelę Brute Force Cezara
    useEffect(() => {
        if (isBruteForceBlocked) {
            setBruteForceData(null);
        }
    }, [isBruteForceBlocked]);

    useEffect(() => {
        if (initialCipherOrigin) {
            setSelectedCipherType(initialCipherOrigin);
        }
    }, [initialCipherOrigin]);

    const handleAnalyze = () => {
        if (!cipherText.trim()) {
            setError('Wklej lub wpisz tekst szyfrogramu do analizy.');
            setAnalysisData(null);
            return;
        }
        setError('');
        setAnalysisData(computeLocalFrequencyAnalysis(cipherText, activeLangInfo));
    };

    const runBruteForce = async (targetLang = language) => {
        if (isBruteForceBlocked) {
            return;
        }
        if (!cipherText.trim()) {
            setError('Wklej lub wpisz tekst szyfrogramu przed uruchomieniem ataku Brute Force.');
            setBruteForceData(null);
            return;
        }

        const langObj = languages.find((l) => l.code === targetLang) || activeLangInfo;
        setBruteForceLoading(true);
        setError('');

        try {
            const response = await fetch('/api/v1/caesar/brute-force', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: cipherText,
                    language: targetLang,
                }),
            });

            if (response.status === 404 || response.status === 405) {
                setBruteForceData(computeLocalCaesarBruteForce(cipherText, langObj));
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let msg = 'Wystąpił błąd podczas ataku Brute Force.';
                if (errData.detail) {
                    msg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
                }
                setError(msg);
                return;
            }

            const data = await response.json();
            setBruteForceData({
                ...data,
                isLocalFallback: false,
            });

            if (!analysisData) {
                setAnalysisData(computeLocalFrequencyAnalysis(cipherText, langObj));
            }
        } catch {
            setBruteForceData(computeLocalCaesarBruteForce(cipherText, langObj));
        } finally {
            setBruteForceLoading(false);
        }
    };

    useEffect(() => {
        setChartShift(0);
        if (cipherText.trim()) {
            setAnalysisData(computeLocalFrequencyAnalysis(cipherText, activeLangInfo));
            if (bruteForceData && !isBruteForceBlocked) {
                runBruteForce(language);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    useEffect(() => {
        if (initialCiphertext.trim()) {
            setCipherText(initialCiphertext);
            setAnalysisData(computeLocalFrequencyAnalysis(initialCiphertext, activeLangInfo));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCiphertext]);

    const handleAutoFitChart = () => {
        if (!analysisData) return;
        const freqs = analysisData.frequencies;
        const len = freqs.length;
        let bestS = 0;
        let bestScore = Infinity;

        for (let s = 0; s < len; s += 1) {
            let chi = 0;
            for (let i = 0; i < len; i += 1) {
                const shiftedFreq = freqs[(i + s) % len].frequency;
                const expected = freqs[i].natural_frequency || 0.05;
                chi += ((shiftedFreq - expected) ** 2) / expected;
            }
            if (chi < bestScore) {
                bestScore = chi;
                bestS = s;
            }
        }
        setChartShift(bestS);
    };

    const shiftedFrequencies = useMemo(() => {
        if (!analysisData) return [];
        const freqs = analysisData.frequencies;
        const len = freqs.length;
        return freqs.map((baseItem, idx) => {
            const sourceItem = freqs[(idx + chartShift) % len];
            return {
                targetLetter: baseItem.letter,
                sourceLetter: sourceItem.letter,
                frequency: sourceItem.frequency,
                count: sourceItem.count,
                natural_frequency: baseItem.natural_frequency,
            };
        });
    }, [analysisData, chartShift]);

    const rankingRows = useMemo(
        () => (bruteForceData ? buildRankingRows(bruteForceData) : []),
        [bruteForceData]
    );
    const rankingWinner = !bruteForceData?.isLocalFallback && rankingRows.length > 0 ? rankingRows[0] : null;
    const isUncertainVerdict = rankingWinner !== null && rankingWinner.probability < VERDICT_CONFIDENCE;
    const isNotCaesarVerdict = rankingWinner !== null && !isUncertainVerdict && rankingWinner.isNotCaesar;
    // Rozmiar słownika modelu: litery alfabetu + znak obcej litery (#) + separator (spacja).
    const modelVocabSize = (bruteForceData?.alphabet_len ?? activeLangInfo.alphabet_len) + 2;

    const liveDecryptedPreview = useMemo(() => {
        if (!cipherText.trim()) return '';
        return decryptWithShiftLocally(cipherText, chartShift, activeLangInfo.alphabet);
    }, [cipherText, chartShift, activeLangInfo]);

    useEffect(() => {
        if (!analysisData || !canvasRef.current || shiftedFrequencies.length === 0) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const labels = shiftedFrequencies.map((f) => f.targetLetter);
        const cipherVals = shiftedFrequencies.map((f) => f.frequency);
        const naturalVals = shiftedFrequencies.map((f) => f.natural_frequency);

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: chartShift === 0
                            ? 'Szyfrogram (%)'
                            : `Szyfrogram przesunięty (Skok klucza: +${chartShift}) (%)`,
                        data: cipherVals,
                        backgroundColor: 'rgba(99, 102, 241, 0.85)',
                        borderColor: '#818cf8',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 1,
                    },
                    {
                        label: `Naturalny Język: ${activeLangInfo.name} (%) [Tło]`,
                        data: naturalVals,
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
                animation: { duration: 180 },
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
                            label(context) {
                                const value = context.parsed.y;
                                if (context.datasetIndex === 0) {
                                    const item = shiftedFrequencies[context.dataIndex];
                                    if (chartShift > 0) {
                                        return `Litera szyfrogramu '${item.sourceLetter}' → '${item.targetLetter}': ${value}% (${item.count} wyst.)`;
                                    }
                                    return `Szyfrogram '${item.sourceLetter}': ${value}% (${item.count} wystąpień)`;
                                }
                                return `Wzorzec (${activeLangInfo.name}): ${value}%`;
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
                        title: {
                            display: true,
                            text: 'Częstotliwość występowania (%)',
                            color: '#94a3b8',
                            font: { size: 12 },
                        },
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
    }, [analysisData, shiftedFrequencies, chartShift, activeLangInfo]);

    const stepChartShift = (delta) => {
        const len = activeLangInfo.alphabet.length;
        setChartShift((prev) => (prev + delta + len) % len);
    };

    const firstAlpha = activeLangInfo.alphabet[0];
    const mappedAlpha = activeLangInfo.alphabet[chartShift % activeLangInfo.alphabet.length];

    return (
        <div className="cryptanalysis-page">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge badge--crypto">Laboratorium Kryptoanalizy &amp; NLTK</span>
                <h1 className="title">Kryptoanaliza / Łamanie Szyfrów</h1>
                <p className="subtitle">
                    Wizualna analiza częstotliwościowa ze skokowym przesuwaniem wykresu oraz inteligentne łamanie Cezara wspierane modelem językowym NLTK (udhr2).
                </p>
            </header>

            <main className="card cryptanalysis-card">
                {/* Pasek wyboru języka oraz rodzaju szyfru */}
                <div className="crypto-selectors-stack">
                    <div className="lang-toolbar">
                        <span className="lang-toolbar__label">Język alfabetu i modelu NLTK:</span>
                        <div className="alpha-switch" role="group" aria-label="Wybór języka analizy">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    className={`alpha-switch__btn ${language === lang.code ? 'active' : ''}`}
                                    onClick={() => onLanguageChange && onLanguageChange(lang.code)}
                                >
                                    {lang.name} ({lang.alphabet_len})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lang-toolbar">
                        <span className="lang-toolbar__label">Badany szyfr (algorytm źródłowy):</span>
                        <div className="alpha-switch" role="group" aria-label="Wybór rodzaju szyfru">
                            {CIPHER_TYPES.map((ct) => (
                                <button
                                    key={ct.id}
                                    type="button"
                                    className={`alpha-switch__btn ${selectedCipherType === ct.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCipherType(ct.id)}
                                >
                                    {ct.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

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
                        placeholder="Wklej tutaj zaszyfrowany tekst..."
                        autoComplete="off"
                        spellCheck={false}
                    />

                    {/* Wirtualna klawiatura dla języków niepolskich również w Kryptoanalizie */}
                    {activeLangInfo.code !== 'pl' && (
                        <div className="virtual-keyboard">
                            <div className="virtual-keyboard__header">
                                <div className="virtual-keyboard__title">
                                    <span>⌨️ Wirtualna klawiatura: <strong>{activeLangInfo.name}</strong></span>
                                </div>
                                <div className="virtual-keyboard__actions">
                                    <button
                                        type="button"
                                        className={`vk-ctrl-btn ${!vkUpper ? 'active' : ''}`}
                                        onClick={() => setVkUpper((p) => !p)}
                                    >
                                        {vkUpper ? 'ABC → abc' : 'abc → ABC'}
                                    </button>
                                    <button
                                        type="button"
                                        className="vk-ctrl-btn"
                                        onClick={() => setVkOpen((p) => !p)}
                                    >
                                        {vkOpen ? 'Ukryj ▲' : 'Pokaż ▼'}
                                    </button>
                                </div>
                            </div>
                            {vkOpen && (
                                <div className="virtual-keyboard__keys">
                                    {activeLangInfo.alphabet.split('').map((ch) => {
                                        const outCh = vkUpper ? ch : ch.toLowerCase();
                                        return (
                                            <button
                                                key={ch}
                                                type="button"
                                                className="vk-key"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => setCipherText((prev) => prev + outCh)}
                                            >
                                                {outCh}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        className="vk-key vk-key--wide"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setCipherText((prev) => `${prev} `)}
                                    >
                                        ␣ Spacja
                                    </button>
                                    <button
                                        type="button"
                                        className="vk-key vk-key--wide vk-key--danger"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setCipherText((prev) => prev.slice(0, -1))}
                                    >
                                        ⌫ Usuń
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="analysis-action-bar">
                    <button
                        type="button"
                        className="primary-button analyze-btn"
                        onClick={handleAnalyze}
                        style={{ width: 'auto' }}
                    >
                        📊 Analizuj Częstotliwość i Wykres
                    </button>
                    <button
                        type="button"
                        className="secondary-button brute-force-btn"
                        onClick={() => runBruteForce(language)}
                        disabled={bruteForceLoading || isBruteForceBlocked}
                        title={
                            isBruteForceBlocked
                                ? 'Atak Brute Force jest niedostępny dla szyfrów polialfabetycznych (Vigenère) i digraficznych (Playfair).'
                                : 'Przetestuj wszystkie przesunięcia szyfru Cezara z modelem NLTK'
                        }
                    >
                        {isBruteForceBlocked
                            ? `🔒 Brute Force niedostępny (${selectedCipherType === 'vigenere' ? 'Vigenère' : 'Playfair'})`
                            : bruteForceLoading
                            ? 'Ocenianie przez NLTK...'
                            : '⚡ Złam (Cezar - Brute Force + NLTK)'}
                    </button>
                </div>

                {isBruteForceBlocked && (
                    <div className="callout callout--danger" role="note" style={{ marginBottom: 0 }}>
                        <strong>Dlaczego atak Brute Force jest zablokowany dla szyfru {selectedCipherType === 'vigenere' ? 'Vigenère’a' : 'Playfair'}?</strong>
                        {selectedCipherType === 'vigenere' ? (
                            <p>
                                Szyfr Vigenère’a używa wieloliterowego słowa kluczowego. Już dla 8-znakowego klucza w alfabecie polskim liczba kombinacji wynosi <strong>32⁸ ≈ 1,1 biliona (1,09 × 10¹²)</strong> możliwości (wobec zaledwie 31 kluczy w Cezarze!). Taki szyfr bada się wykresem spłaszczenia częstotliwości oraz Indeksem Koincydencji (IoC), a nie prostym przeglądem zupełnym.
                            </p>
                        ) : (
                            <p>
                                Szyfr Playfair operuje na permutacji macierzy 5×5 (25 liter), co daje gigantyczną przestrzeń <strong>25! ≈ 1,55 × 10²⁵</strong> możliwych kluczy siatki! Prosty atak Brute Force jest tu matematycznie niewykonalny — użyj przycisku <strong>Analizuj Częstotliwość i Wykres</strong>, aby zobaczyć, jak szyfrowanie par liter spłaszcza rozkład pojedynczych znaków.
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}

                {bruteForceData && !isBruteForceBlocked && (
                    <section className="brute-force-section" aria-label="Wyniki ataku Brute Force dla szyfru Cezara">
                        <div className="brute-force-header">
                            <div>
                                <h3 className="brute-force-title">
                                    Wyniki Brute Force — Szyfr Cezara ({bruteForceData.alphabet_len - 1} kluczy, {activeLangInfo.name})
                                </h3>
                                <p className="brute-force-subtitle">
                                    {bruteForceData.isLocalFallback
                                        ? 'Tryb lokalny (brak połączenia z backendem NLTK) — kandydaci w kolejności klucza.'
                                        : 'Posortowano malejąco według prawdopodobieństwa języka naturalnego wyliczonego przez model NLTK (udhr2)!'}
                                </p>
                            </div>
                            <span className={`badge ${bruteForceData.isLocalFallback ? '' : 'badge--crypto'}`}>
                                {bruteForceData.isLocalFallback ? 'Local Fallback' : 'NLTK Trigram Model Active'}
                            </span>
                        </div>

                        {isNotCaesarVerdict && (
                            <div className="callout callout--danger" role="status">
                                <strong>To najpewniej nie jest szyfr Cezara ({(rankingWinner.probability * 100).toFixed(2)}%).</strong>
                                <p>
                                    Żadne z {bruteForceData.alphabet_len - 1} przesunięć nie daje tekstu bardziej podobnego do języka ({activeLangInfo.name}) niż losowe litery. Spłaszczony rozkład wskazuje na szyfr polialfabetyczny (np. Vigenère) lub digraficzny (Playfair) — sprawdź Indeks Koincydencji i wykres częstotliwości poniżej.
                                </p>
                            </div>
                        )}
                        {isUncertainVerdict && (
                            <div className="callout callout--warning" role="status">
                                <strong>Wynik niepewny — najwyższa pewność to tylko {(rankingWinner.probability * 100).toFixed(2)}%.</strong>
                                <p>
                                    Tekst jest prawdopodobnie zbyt krótki, aby model NLTK mógł rozstrzygnąć, które przesunięcie (lub hipoteza „nie Cezar”) jest prawidłowe. Spróbuj dłuższego szyfrogramu.
                                </p>
                            </div>
                        )}

                        {!bruteForceData.isLocalFallback && (
                            <details className="callout callout--info brute-force-explainer">
                                <summary><strong>Skąd się biorą te procenty?</strong></summary>
                                <p>
                                    Model trygramowy NLTK ocenia każdego kandydata jako <code>ln P(tekst)</code> — sumę logarytmów prawdopodobieństw kolejnych znaków.
                                    Do rankingu dołączona jest też hipoteza <strong>„nie Cezar”</strong>, która zakłada, że każdy znak jest losowy:
                                </p>
                                <p className="brute-force-explainer__formula">
                                    ln P<sub>nie Cezar</sub> = n · ln(1/{modelVocabSize}) ≈ n · ({(-Math.log(modelVocabSize)).toFixed(2)})
                                </p>
                                <p>
                                    gdzie <em>n</em> to liczba ocenianych znaków, a {modelVocabSize} to {bruteForceData.alphabet_len} liter alfabetu + obca litera + separator.
                                    Wszystkie {bruteForceData.alphabet_len} wyniki ({bruteForceData.alphabet_len - 1} przesunięć i „nie Cezar”) trafiają do jednego softmaxu, dlatego procenty w tabeli sumują się do 100%.
                                    Bez tej hipotezy softmax zawsze musiałby wskazać któreś przesunięcie — nawet dla losowego tekstu.
                                </p>
                            </details>
                        )}

                        <div className="brute-force-table-wrapper">
                            <table className="brute-force-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="brute-force-th-key">Klucz</th>
                                        {!bruteForceData.isLocalFallback && (
                                            <th scope="col" style={{ width: '170px' }}>Pewność NLTK</th>
                                        )}
                                        <th scope="col" className="brute-force-th-result">Odszyfrowany tekst (Kandydat)</th>
                                        <th scope="col" style={{ width: '110px' }}>Wykres</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankingRows.map((cand, idx) => {
                                        const isTopWinner = !bruteForceData.isLocalFallback && idx === 0;

                                        if (cand.isNotCaesar) {
                                            return (
                                                <tr
                                                    key="not-caesar"
                                                    className={`brute-force-row brute-force-row--not-caesar ${isTopWinner ? 'brute-force-row--not-caesar-best' : ''}`}
                                                >
                                                    <td className="brute-force-cell-key">
                                                        <span className="key-pill key-pill--not-caesar">🚫 Nie Cezar</span>
                                                        {isTopWinner && (
                                                            <span className="nltk-best-tag nltk-best-tag--danger">🏆 #1 NLTK</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <ProbabilityCell probability={cand.probability} danger />
                                                    </td>
                                                    <td className="brute-force-cell-result brute-force-cell-result--muted">
                                                        Żadne przesunięcie — tekst bardziej przypomina losowe litery niż język naturalny.
                                                    </td>
                                                    <td>—</td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr
                                                key={cand.shift}
                                                className={`brute-force-row ${isTopWinner ? 'brute-force-row--best' : ''}`}
                                            >
                                                <td className="brute-force-cell-key">
                                                    <span className="key-pill">+{cand.shift}</span>
                                                    {isTopWinner && (
                                                        <span className="nltk-best-tag">🏆 #1 NLTK</span>
                                                    )}
                                                </td>
                                                {!bruteForceData.isLocalFallback && (
                                                    <td>
                                                        <ProbabilityCell probability={cand.probability} />
                                                    </td>
                                                )}
                                                <td className="brute-force-cell-result">
                                                    {cand.text}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="link-button"
                                                        onClick={() => {
                                                            if (!analysisData) {
                                                                setAnalysisData(computeLocalFrequencyAnalysis(cipherText, activeLangInfo));
                                                            }
                                                            setChartShift(cand.shift);
                                                        }}
                                                    >
                                                        Pokaż skok +{cand.shift}
                                                    </button>
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
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-card__title">Zbadane litery alfabetu</span>
                                <span className="stat-card__value">{analysisData.total_letters}</span>
                                <span className="stat-card__desc">Język: {activeLangInfo.name} ({activeLangInfo.alphabet_len} znaków)</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-card__title">Indeks Koincydencji (IoC)</span>
                                <span className="stat-card__value stat-card__value--ioc">
                                    {analysisData.index_of_coincidence.toFixed(4)}
                                </span>
                                <span className="stat-card__desc">Miara płaskości rozkładu liter</span>
                            </div>
                            <div className="stat-card stat-card--interpretation">
                                <span className="stat-card__title">Interpretacja Kryptoanalityczna</span>
                                <p className="stat-card__interpretation-text">{analysisData.interpretation}</p>
                            </div>
                        </div>

                        <div className="chart-wrapper">
                            <div className="chart-header">
                                <h3 className="chart-title">Wykres Częstotliwości Liter vs Język Naturalny</h3>
                                <span className="chart-legend-badge">
                                    Fiolet = Szyfrogram | Szary = {activeLangInfo.name} (Tło)
                                </span>
                            </div>

                            {/* Kontroler skokowego przesuwania wykresu */}
                            <div className="chart-shift-bar">
                                <div className="chart-shift-bar__top">
                                    <div className="chart-shift-status">
                                        <span className="shift-indicator-pill">
                                            Obecny skok wykresu: <strong>{chartShift === 0 ? '0 (oryginał)' : `+${chartShift}`}</strong>
                                        </span>
                                        <span className="metadata-badge">
                                            Mapowanie deszyfrujące: <strong>{mappedAlpha} → {firstAlpha}</strong>
                                        </span>
                                    </div>

                                    <div className="chart-shift-actions">
                                        <button
                                            type="button"
                                            className="secondary-button chart-step-btn"
                                            onClick={() => stepChartShift(-1)}
                                        >
                                            ◀ Skok -1
                                        </button>
                                        <button
                                            type="button"
                                            className="secondary-button chart-step-btn"
                                            onClick={() => stepChartShift(1)}
                                        >
                                            Skok +1 ▶
                                        </button>
                                        <button
                                            type="button"
                                            className="secondary-button chart-step-btn"
                                            onClick={() => setChartShift(0)}
                                            disabled={chartShift === 0}
                                        >
                                            Reset (0)
                                        </button>
                                        {!isBruteForceBlocked && (
                                            <button
                                                type="button"
                                                className="primary-button chart-step-btn"
                                                onClick={handleAutoFitChart}
                                                style={{ width: 'auto', minHeight: '36px' }}
                                            >
                                                🎯 Auto-dopasuj (χ²)
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-shift-slider-row">
                                    <input
                                        type="range"
                                        className="range"
                                        min="0"
                                        max={maxShift}
                                        step="1"
                                        value={chartShift}
                                        onChange={(e) => setChartShift(Number(e.target.value))}
                                        aria-label="Skokowe przesunięcie wykresu szyfrogramu"
                                    />
                                    <div className="range-scale" aria-hidden="true">
                                        <span>Skok 0</span>
                                        <span>Skok {Math.floor(maxShift / 2)}</span>
                                        <span>Skok {maxShift}</span>
                                    </div>
                                </div>

                                {chartShift > 0 && !isBruteForceBlocked && (
                                    <div className="chart-shift-preview">
                                        <span className="formula-label">Podgląd tekstu dla skoku +{chartShift}:</span>
                                        <div className="chart-shift-preview__text">{liveDecryptedPreview}</div>
                                    </div>
                                )}
                            </div>

                            <div className="chart-canvas-container">
                                <canvas ref={canvasRef} aria-label="Wykres słupkowy częstotliwości liter" />
                            </div>
                        </div>

                        <div className="crypto-edu-guide">
                            <h4>Jak czytać i przesuwać ten wykres?</h4>
                            <div className="edu-guide-columns">
                                <div className="edu-guide-col">
                                    <h5>Szyfr Cezara (monoalfabetyczny)</h5>
                                    <p>
                                        Słupek naturalny i słupek szyfrogramu mają podobny kształt, ale profil szyfrogramu jest <strong>przesunięty w bok</strong> o wartość klucza. Klikaj <strong>Skok +1 / -1</strong>, aż wysokie fioletowe słupki pokryją się z szarymi maksimami języka naturalnego — wyświetlony <strong>Obecny skok</strong> to złamany klucz Cezara!
                                    </p>
                                </div>
                                <div className="edu-guide-col">
                                    <h5>Szyfr Vigenère’a i Playfair</h5>
                                    <p>
                                        Wielokrotne przesunięcia (Vigenère) oraz szyfrowanie całych par liter (Playfair) powodują tzw. <em>spłaszczenie rozkładu</em> pojedynczych znaków oraz blokują prosty atak Brute Force. Żaden pojedynczy skok wykresu nie nałoży idealnie fioletowych słupków na profil języka naturalnego.
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
