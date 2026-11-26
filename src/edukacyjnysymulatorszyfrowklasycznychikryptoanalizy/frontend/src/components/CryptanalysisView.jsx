import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import HighlightableTextarea from './HighlightableTextarea';
import RedSpacesToggleButton from './RedSpacesToggleButton';
import {
    buildRankingRows,
    computeAutoFitShift,
    computeBestFrequencyMatch,
    computeLocalCaesarBruteForce,
    computeLocalFrequencyAnalysis,
    decryptWithShiftLocally,
} from '../utils/cryptoUtils';

const DEFAULT_LANGUAGES = [
    { code: 'pl', name: 'Polski', alphabet: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ', alphabet_len: 32 },
    { code: 'en', name: 'English', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphabet_len: 26 },
    { code: 'de', name: 'Deutsch', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', alphabet_len: 29 },
    { code: 'es', name: 'Español', alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', alphabet_len: 27 },
    { code: 'el', name: 'Ελληνικά', alphabet: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', alphabet_len: 24 },
];

const CIPHER_TYPES = [
    { id: 'caesar', label: 'Szyfr Cezara (Brute Force aktywny)' },
    { id: 'vigenere', label: 'Szyfr Vigenère’a (Tylko analiza wykresu / IoC)' },
    { id: 'playfair', label: 'Szyfr Playfair (Tylko analiza wykresu / IoC)' },
];

// Poniżej tej pewności zwycięzcy rankingu pokazujemy ostrzeżenie, że wynik jest niepewny.
const VERDICT_CONFIDENCE = 0.8;

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
    initialCipherOrigin = 'caesar',
    languages = DEFAULT_LANGUAGES,
    language = 'pl',
    onLanguageChange,
    theme = 'dark',
}) {
    const [cipherText, setCipherText] = useState(initialCiphertext);
    const [selectedCipherType, setSelectedCipherType] = useState(initialCipherOrigin || 'caesar');
    const [vkUpper, setVkUpper] = useState(true);
    const [vkOpen, setVkOpen] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);
    const [bruteForceData, setBruteForceData] = useState(null);
    const [bruteForceLoading, setBruteForceLoading] = useState(false);
    const [chartShift, setChartShift] = useState(0);
    const [highlightSpaces, setHighlightSpaces] = useState(false);
    const [error, setError] = useState('');

    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const activeLangInfo = useMemo(
        () => languages.find((l) => l.code === language) || DEFAULT_LANGUAGES[0],
        [languages, language]
    );

    const isBruteForceBlocked = selectedCipherType === 'vigenere' || selectedCipherType === 'playfair';
    const maxShift = Math.max(1, activeLangInfo.alphabet.length - 1);

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
        setChartShift(computeAutoFitShift(analysisData));
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
    const modelVocabSize = (bruteForceData?.alphabet_len ?? activeLangInfo.alphabet_len) + 2;

    const liveDecryptedPreview = useMemo(() => {
        if (!cipherText.trim()) return '';
        return decryptWithShiftLocally(cipherText, chartShift, activeLangInfo.alphabet);
    }, [cipherText, chartShift, activeLangInfo]);

    const matchAnalysis = useMemo(
        () => computeBestFrequencyMatch(analysisData),
        [analysisData],
    );

    const isMatched = Boolean(
        !isBruteForceBlocked &&
        analysisData &&
        ((matchAnalysis.hasReliableMatch && chartShift === matchAnalysis.bestShift) ||
            (!isUncertainVerdict && !isNotCaesarVerdict && rankingWinner?.shift === chartShift)),
    );

    useEffect(() => {
        if (!analysisData || !canvasRef.current || shiftedFrequencies.length === 0) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const labels = shiftedFrequencies.map((f) => f.targetLetter);
        const cipherVals = shiftedFrequencies.map((f) => f.frequency);
        const naturalVals = shiftedFrequencies.map((f) => f.natural_frequency);
        const palette = getChartPalette(theme, isMatched);

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
                        backgroundColor: palette.barBg,
                        borderColor: palette.barBorder,
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 1,
                    },
                    {
                        label: `Naturalny Język: ${activeLangInfo.name} (%) [Tło]`,
                        data: naturalVals,
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
                animation: { duration: 180 },
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
                        grid: { color: palette.xGrid },
                        ticks: { color: palette.xTicks, font: { size: 12, weight: '600' } },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: palette.yGrid },
                        ticks: { color: palette.yTicks },
                        title: {
                            display: true,
                            text: 'Częstotliwość występowania (%)',
                            color: palette.yTicks,
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
    }, [analysisData, shiftedFrequencies, chartShift, activeLangInfo, theme, isMatched]);

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
                        <div className="field__header-actions">
                            <RedSpacesToggleButton
                                enabled={highlightSpaces}
                                onToggle={() => setHighlightSpaces((prev) => !prev)}
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
                        placeholder="Wklej tutaj zaszyfrowany tekst..."
                        autoComplete="off"
                        spellCheck={false}
                        highlightSpaces={highlightSpaces}
                    />

                    {activeLangInfo.code !== 'pl' && (
                        <div className="virtual-keyboard">
                            <div className="virtual-keyboard__header">
                                <div className="virtual-keyboard__title">
                                    <span>Wirtualna klawiatura: <strong>{activeLangInfo.name}</strong></span>
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
                                        Usuń
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
                        Analizuj Częstotliwość i Wykres
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
                            ? `Brute Force niedostępny (${selectedCipherType === 'vigenere' ? 'Vigenère' : 'Playfair'})`
                            : bruteForceLoading
                            ? 'Ocenianie przez NLTK...'
                            : 'Złam (Cezar - Brute Force + NLTK)'}
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
                                                        <span className="key-pill key-pill--not-caesar">Nie Cezar</span>
                                                        {isTopWinner && (
                                                            <span className="nltk-best-tag nltk-best-tag--danger">#1 NLTK</span>
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
                                                        <span className="nltk-best-tag">#1 NLTK</span>
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

                        <div className={`chart-wrapper ${isMatched ? 'chart-wrapper--matched' : ''}`}>
                            <div className="chart-header">
                                <h3 className="chart-title">Wykres Częstotliwości Liter vs Język Naturalny</h3>
                                <span className={`chart-legend-badge ${isMatched ? 'chart-legend-badge--matched' : ''}`}>
                                    {isMatched ? `Zielony = Poprawne dopasowanie! | Szary = ${activeLangInfo.name} (Tło)` : `Fiolet = Szyfrogram | Szary = ${activeLangInfo.name} (Tło)`}
                                </span>
                                {isMatched && (
                                    <span className="match-status-pill" role="status">
                                        {chartShift === 0
                                            ? '✓ Znaleziono poprawne dopasowanie (tekst jawny / klucz 0)'
                                            : `✓ Znaleziono poprawne dopasowanie! Klucz Cezara: +${chartShift}`}
                                    </span>
                                )}
                            </div>

                            <div className="chart-shift-bar">
                                <div className="chart-shift-bar__top">
                                    <div className="chart-shift-status">
                                        <span className={`shift-indicator-pill ${isMatched ? 'delta-badge--matched' : ''}`}>
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
                                                Auto-dopasuj (χ²)
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

                            <div className={`chart-canvas-container ${isMatched ? 'chart-canvas-container--matched' : ''}`}>
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
