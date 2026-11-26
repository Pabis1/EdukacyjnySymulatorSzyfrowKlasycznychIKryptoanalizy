import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    DEFAULT_PLAYFAIR_KEYWORD,
    buildLocalPlayfairMatrix,
    buildRankingRows,
    computeAutoFitShift,
    computeBestFrequencyMatch,
    computeLocalCaesarBruteForce,
    computeLocalFrequencyAnalysis,
    decryptWithShiftLocally,
    formatCaesarShift,
    getEffectivePlayfairKeyword,
    normalizePlayfairKeyword,
} from './cryptoUtils.js';

const PL_LANG = { code: 'pl', name: 'Polski', alphabet: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ', alphabet_len: 32 };
const EN_LANG = { code: 'en', name: 'English', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphabet_len: 26 };

function encryptCaesarLocal(text, shift, alphabet) {
    const len = alphabet.length;
    return text
        .split('')
        .map((ch) => {
            const upper = ch.toUpperCase();
            const idx = alphabet.indexOf(upper);
            if (idx === -1) return ch;
            const out = alphabet[(idx + (shift % len) + len) % len];
            return ch === upper ? out : out.toLowerCase();
        })
        .join('');
}

describe('Playfair — domyślny klucz ENIGMA i macierz 5x5', () => {
    it('zwraca ENIGMA po wyczyszczeniu klucza lub wpisaniu samych znaków spoza A-Z', () => {
        assert.equal(DEFAULT_PLAYFAIR_KEYWORD, 'ENIGMA');
        assert.equal(getEffectivePlayfairKeyword(''), 'ENIGMA');
        assert.equal(getEffectivePlayfairKeyword('   '), 'ENIGMA');
        assert.equal(getEffectivePlayfairKeyword('123 !@# ąćęłńóśźż'), 'ENIGMA');
    });

    it('normalizuje klucz użytkownika i zamienia J na I', () => {
        assert.equal(normalizePlayfairKeyword('Jabłko 123!'), 'IABKO');
        assert.equal(getEffectivePlayfairKeyword('Jabłko 123!'), 'IABKO');
    });

    it('buduje identyczną siatkę 5x5 dla pustego klucza oraz klucza ENIGMA', () => {
        const emptyKeyMatrix = buildLocalPlayfairMatrix('');
        const enigmaMatrix = buildLocalPlayfairMatrix('ENIGMA');
        assert.deepEqual(emptyKeyMatrix, enigmaMatrix);
        assert.equal(emptyKeyMatrix.length, 25);
        assert.equal(emptyKeyMatrix.includes('J'), false);
        assert.equal(emptyKeyMatrix.join(''), 'ENIGMABCDFHKLOPQRSTUVWXYZ');
    });

    it('buduje klasyczną siatkę dla własnego klucza PLAYFAIR EXAMPLE', () => {
        assert.equal(
            buildLocalPlayfairMatrix('playfair example').join(''),
            'PLAYFIREXMBCDGHKNOQSTUVWZ',
        );
    });
});

describe('Szyfr Cezara — formatowanie i lokalna kryptoanaliza Brute Force', () => {
    it('poprawnie formatuje znak przesunięcia dla szyfrowania i deszyfrowania', () => {
        assert.equal(formatCaesarShift(3, 'encrypt'), '+3');
        assert.equal(formatCaesarShift(3, 'decrypt'), '-3');
        assert.equal(formatCaesarShift(-3, 'decrypt'), '+3');
        assert.equal(formatCaesarShift(0, 'decrypt'), '+0');
    });

    it('lokalnie odszyfrowuje tekst z zachowaniem wielkości liter i interpunkcji', () => {
        assert.equal(decryptWithShiftLocally('ĄbC! 123', 1, PL_LANG.alphabet), 'AąB! 123');
    });

    it('generuje wszystkie 31 kandydatów Brute Force dla polskiego alfabetu', () => {
        const cipher = encryptCaesarLocal('Tajna wiadomość!', 5, PL_LANG.alphabet);
        const bf = computeLocalCaesarBruteForce(cipher, PL_LANG);
        assert.equal(bf.isLocalFallback, true);
        assert.equal(bf.candidates.length, 31);
        assert.equal(bf.candidates[4].shift, 5);
        assert.equal(bf.candidates[4].text, 'Tajna wiadomość!');
    });
});

describe('Kryptoanaliza — częstość liter, IoC, dopasowanie χ² oraz ranking NLTK', () => {
    it('oblicza dokładne częstości procentowe oraz Indeks Koincydencji (IoC)', () => {
        const res = computeLocalFrequencyAnalysis('AAAAABBBCC', EN_LANG);
        assert.equal(res.total_letters, 10);
        assert.equal(res.frequencies.find((f) => f.letter === 'A').frequency, 50);
        assert.equal(res.frequencies.find((f) => f.letter === 'B').frequency, 30);
        assert.equal(res.frequencies.find((f) => f.letter === 'C').frequency, 20);
        assert.equal(res.index_of_coincidence, 0.3111);
    });

    it('zwraca IoC = 1.0 dla tekstu jednoliterowego oraz 0 dla braku liter', () => {
        assert.equal(computeLocalFrequencyAnalysis('AAAAA', PL_LANG).index_of_coincidence, 1);
        assert.equal(computeLocalFrequencyAnalysis('123 !@#', PL_LANG).index_of_coincidence, 0);
    });

    it('automatycznie odnajduje właściwy skok wykresu (χ² oraz podobieństwo cosinusowe)', () => {
        const sample =
            'THERE IS NO SECRET THAT CAN REMAIN HIDDEN FOREVER WHEN AN ENTIRE NATION READS THE LETTERS SENT ACROSS THE NORTHERN BORDER IN THE EARLY MORNING';
        const encrypted = encryptCaesarLocal(sample, 7, EN_LANG.alphabet);
        const analysis = computeLocalFrequencyAnalysis(encrypted, EN_LANG);

        assert.equal(computeAutoFitShift(analysis), 7);
        const match = computeBestFrequencyMatch(analysis);
        assert.equal(match.hasReliableMatch, true);
        assert.equal(match.bestShift, 7);
    });

    it('wstawia wiersz hipotezy "Nie Cezar" na właściwej pozycji prawdopodobieństwa', () => {
        const rows = buildRankingRows({
            isLocalFallback: false,
            not_caesar_probability: 0.25,
            candidates: [
                { shift: 4, text: 'TEST', probability: 0.65 },
                { shift: 1, text: 'ABCD', probability: 0.10 },
            ],
        });
        assert.equal(rows.length, 3);
        assert.equal(rows[0].shift, 4);
        assert.equal(rows[1].isNotCaesar, true);
        assert.equal(rows[2].shift, 1);
    });
});