export const DEFAULT_PLAYFAIR_KEYWORD = 'ENIGMA';
export const MAX_PLAYFAIR_KEY_LENGTH = 25;

export const NATURAL_FREQUENCIES = {
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

export function formatCaesarShift(shift, mode) {
    const raw = mode === 'encrypt' ? Number(shift) : -Number(shift);
    const signed = raw === 0 ? 0 : raw;
    return signed < 0 ? `-${Math.abs(signed)}` : `+${signed}`;
}

export function normalizePlayfairKeyword(keyword = '') {
    return String(keyword ?? '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
}

export function getEffectivePlayfairKeyword(keyword = '') {
    const normalized = normalizePlayfairKeyword(keyword);
    return normalized || DEFAULT_PLAYFAIR_KEYWORD;
}

export function buildLocalPlayfairMatrix(keyword = '') {
    const clean = getEffectivePlayfairKeyword(keyword);
    const alpha = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    const seen = new Set();
    const out = [];
    for (const ch of clean + alpha) {
        if (!seen.has(ch) && alpha.includes(ch)) {
            seen.add(ch);
            out.push(ch);
        }
    }
    return out;
}

export function buildRankingRows(bruteForceData) {
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

export function computeLocalFrequencyAnalysis(text, langInfo) {
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

export function decryptWithShiftLocally(text, shift, alphabetStr) {
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

export function computeLocalCaesarBruteForce(text, langInfo) {
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

export function computeAutoFitShift(analysisData) {
    if (!analysisData?.frequencies?.length) return 0;
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
    return bestS;
}

export function computeBestFrequencyMatch(analysisData) {
    if (!analysisData?.frequencies?.length || analysisData.total_letters < 15) {
        return { hasReliableMatch: false, bestShift: null };
    }
    const freqs = analysisData.frequencies;
    const len = freqs.length;
    const naturalFreqs = freqs.map((f) => f.natural_frequency || 0);
    const naturalNorm = Math.sqrt(naturalFreqs.reduce((acc, v) => acc + v * v, 0));
    if (naturalNorm === 0) {
        return { hasReliableMatch: false, bestShift: null };
    }

    const similarities = [];
    for (let shift = 0; shift < len; shift += 1) {
        let dot = 0;
        let shiftedSq = 0;
        for (let i = 0; i < len; i += 1) {
            const val = freqs[(i + shift) % len].frequency;
            dot += val * naturalFreqs[i];
            shiftedSq += val * val;
        }
        const denom = Math.sqrt(shiftedSq) * naturalNorm;
        similarities.push({ shift, cos: denom > 0 ? dot / denom : 0 });
    }

    similarities.sort((a, b) => b.cos - a.cos);
    const best = similarities[0];
    const secondBest = similarities[1] || { cos: 0 };
    const gap = best.cos - secondBest.cos;

    const hasReliableMatch =
        (best.cos >= 0.85 && gap >= 0.065) ||
        (best.cos >= 0.76 && gap >= 0.11);

    return {
        hasReliableMatch,
        bestShift: best.shift,
    };
}
