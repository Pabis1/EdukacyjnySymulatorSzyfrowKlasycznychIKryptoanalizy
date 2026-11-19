export const PLAYFAIR_ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export function generatePlayfairMatrix(keyword = '') {
    const raw = (keyword || '').toUpperCase().replaceAll('J', 'I');
    const normalizedKeywordChars = [];
    const seen = new Set();

    for (const char of raw) {
        if (PLAYFAIR_ALPHABET.includes(char) && !seen.has(char)) {
            seen.add(char);
            normalizedKeywordChars.push(char);
        }
    }

    const matrixChars = [...normalizedKeywordChars];
    for (const char of PLAYFAIR_ALPHABET) {
        if (!seen.has(char)) {
            seen.add(char);
            matrixChars.push(char);
        }
    }

    const grid = [];
    for (let r = 0; r < 5; r += 1) {
        grid.push(matrixChars.slice(r * 5, (r + 1) * 5));
    }

    return {
        normalizedKeyword: normalizedKeywordChars.join(''),
        keywordChars: normalizedKeywordChars,
        keywordSet: new Set(normalizedKeywordChars),
        matrixChars,
        grid,
    };
}
