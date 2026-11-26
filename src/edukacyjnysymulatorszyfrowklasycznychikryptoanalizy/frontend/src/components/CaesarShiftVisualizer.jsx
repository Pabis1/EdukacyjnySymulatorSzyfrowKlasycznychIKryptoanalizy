import React, { useState } from 'react';

const FALLBACK_ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';

const TILE_SIZE = 38;
const TILE_GAP = 6;
const TILE_STEP = TILE_SIZE + TILE_GAP; // 44px

export default function CaesarShiftVisualizer({
    shift = 3,
    mode = 'encrypt',
    alphabet = FALLBACK_ALPHABET,
    languageName = 'Polski',
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const activeAlphabet = (alphabet || FALLBACK_ALPHABET).split('');
    const len = activeAlphabet.length;
    const firstChar = activeAlphabet[0];
    const lastChar = activeAlphabet[len - 1];

    // Przesunięcie ze znakiem kierunku: szyfrowanie dodaje klucz, deszyfrowanie odejmuje.
    // Ujemny klucz przesuwa dolny rząd w przeciwną stronę, a nie o (len - |klucz|) w tę samą.
    const signedShift = (mode === 'encrypt' ? Number(shift) : -Number(shift)) % len;
    const effectiveShift = ((signedShift % len) + len) % len;
    const shiftLabel = signedShift < 0 ? `-${Math.abs(signedShift)}` : `+${signedShift}`;
    const formulaOp = signedShift < 0 ? '-' : '+';

    const startIdx = len + signedShift;
    const viewportWidth = len * TILE_STEP - TILE_GAP;
    const tripleAlphabet = [...activeAlphabet, ...activeAlphabet, ...activeAlphabet];

    return (
        <section className="shift-visualizer" aria-label="Graficzna wizualizacja przesuwania alfabetu">
            <div className="shift-visualizer__header">
                <div>
                    <h3 className="shift-visualizer__title">
                        Wizualizacja przesuwania alfabetu (Klocki Cezara)
                    </h3>
                    <p className="shift-visualizer__subtitle">
                        Górny rząd jest stały, a dolny płynnie przesuwa się w lewo lub w prawo synchronicznie z suwakiem klucza.
                    </p>
                </div>

                <div className="shift-visualizer__controls">
                    <span className="metadata-badge">
                        Język: <strong>{languageName} ({len})</strong>
                    </span>
                    <span className="shift-indicator-pill">
                        Przesunięcie: <strong>{shiftLabel}</strong>
                    </span>
                </div>
            </div>

            <div className="shift-visualizer__viewport-container">
                <div className="shift-visualizer__viewport">
                    <div className="shift-visualizer__labels">
                        <div className="row-tag row-tag--top">
                            <span>Tekst jawny</span>
                            <small>Stały ({firstChar}–{lastChar})</small>
                        </div>
                        <div className="row-direction-arrow">↓</div>
                        <div className="row-tag row-tag--bottom">
                            <span>Zaszyfrowany</span>
                            <small>Przesunięty ({shiftLabel})</small>
                        </div>
                    </div>

                    <div className="shift-visualizer__stage">
                        <div className="tiles-row tiles-row--top">
                            {activeAlphabet.map((char, index) => {
                                const isHovered = hoveredIndex === index;
                                return (
                                    <div
                                        key={`top-${char}-${index}`}
                                        className={`tile tile--top ${isHovered ? 'tile--hovered' : ''}`}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        title={`Litera jawna: ${char} (indeks: ${index})`}
                                    >
                                        <span className="tile__char">{char}</span>
                                        <span className="tile__idx">{index}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="tiles-connectors">
                            {activeAlphabet.map((_, index) => {
                                const isHovered = hoveredIndex === index;
                                return (
                                    <div
                                        key={`conn-${index}`}
                                        className={`connector-line ${isHovered ? 'connector-line--active' : ''}`}
                                    >
                                        <span className="connector-arrow">↓</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div
                            className="tiles-row-window"
                            style={{ width: `${viewportWidth}px` }}
                        >
                            <div
                                className="tiles-row tiles-row--sliding"
                                style={{
                                    transform: `translateX(-${startIdx * TILE_STEP}px)`,
                                    transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                                }}
                            >
                                {tripleAlphabet.map((cipherChar, stripIdx) => {
                                    const columnIdx = stripIdx - startIdx;
                                    const isVisibleColumn = columnIdx >= 0 && columnIdx < len;
                                    const isHovered = isVisibleColumn && hoveredIndex === columnIdx;
                                    const cipherIndex = stripIdx % len;

                                    return (
                                        <div
                                            key={`bottom-${stripIdx}`}
                                            className={`tile tile--bottom ${isHovered ? 'tile--hovered' : ''}`}
                                            onMouseEnter={() => isVisibleColumn && setHoveredIndex(columnIdx)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            title={
                                                isVisibleColumn
                                                    ? `${activeAlphabet[columnIdx]} -> ${cipherChar} (indeks: ${cipherIndex})`
                                                    : cipherChar
                                            }
                                        >
                                            <span className="tile__char">{cipherChar}</span>
                                            <span className="tile__idx">{cipherIndex}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shift-visualizer__footer">
                <span className="hint-pill">
                    Wskazówka: Najedź kursorem na dowolny klocek, aby zobaczyć powiązanie między literą jawną a zaszyfrowaną.
                </span>
                {hoveredIndex !== null && hoveredIndex < len && (
                    <div className="hovered-match-badge">
                        Dopasowanie: <strong>{activeAlphabet[hoveredIndex]}</strong> (#{hoveredIndex})
                        &nbsp;→&nbsp;
                        <strong>{activeAlphabet[(hoveredIndex + effectiveShift) % len]}</strong> (#{(hoveredIndex + effectiveShift) % len})
                        &nbsp;[wzór: ({hoveredIndex} {formulaOp} {Math.abs(signedShift)}) mod {len}]
                    </div>
                )}
            </div>
        </section>
    );
}
