import React, { useMemo } from 'react';
import { generatePlayfairMatrix } from '../utils/playfair';

export default function PlayfairMatrixVisualizer({
    keyword = '',
    activePair = null,
}) {
    const {
        keywordChars,
        keywordSet,
        grid,
    } = useMemo(() => generatePlayfairMatrix(keyword), [keyword]);

    const activePairUpper = useMemo(() => {
        if (!activePair || typeof activePair !== 'string') return [];
        return activePair.toUpperCase().replaceAll('J', 'I').split('');
    }, [activePair]);

    return (
        <div
            className="playfair-matrix-box"
            aria-label="Wizualizacja macierzy klucza Playfair 5x5"
        >
            <div className="playfair-matrix-box__header">
                <div className="playfair-matrix-box__title-group">
                    <h3 className="playfair-matrix-box__title">
                        Macierz Klucza Playfair (5×5)
                    </h3>
                    <p className="playfair-matrix-box__subtitle">
                        Podgląd układu liter hasła i alfabetu w siatce
                    </p>
                </div>
                <span className="badge badge--crypto">
                    Siatka 25 liter
                </span>
            </div>

            <div className="playfair-matrix-table-wrapper">
                <table className="playfair-matrix-table" aria-label="Tabela macierzy Playfair 5x5">
                    <thead>
                        <tr>
                            <th scope="col" className="playfair-matrix-th-corner">
                                W\K
                            </th>
                            {[1, 2, 3, 4, 5].map((colNum) => (
                                <th key={colNum} scope="col" className="playfair-matrix-th">
                                    {colNum}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {grid.map((rowLetters, rowIdx) => (
                            <tr key={rowIdx}>
                                <th scope="row" className="playfair-matrix-row-header">
                                    {rowIdx + 1}
                                </th>
                                {rowLetters.map((letter, colIdx) => {
                                    const isFromKeyword = keywordSet.has(letter);
                                    const keywordOrder = isFromKeyword
                                        ? keywordChars.indexOf(letter) + 1
                                        : null;
                                    const isHighlighted = activePairUpper.includes(letter);

                                    return (
                                        <td
                                            key={colIdx}
                                            className={`playfair-cell ${
                                                isFromKeyword ? 'playfair-cell--keyword' : 'playfair-cell--alphabet'
                                            } ${isHighlighted ? 'playfair-cell--highlighted' : ''}`}
                                            title={`Litera ${letter} (${isFromKeyword ? `z hasła #${keywordOrder}` : 'z alfabetu'}) [Wiersz ${rowIdx + 1}, Kolumna ${colIdx + 1}]`}
                                        >
                                            <div className="playfair-cell__inner">
                                                <span className="playfair-cell__letter">
                                                    {letter === 'I' ? 'I/J' : letter}
                                                </span>
                                                {isFromKeyword && (
                                                    <span className="playfair-cell__order">
                                                        #{keywordOrder}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="playfair-matrix-footer">
                <div className="playfair-legend">
                    <div className="legend-item">
                        <span className="legend-swatch legend-swatch--keyword"></span>
                        <span>Litery z hasła ({keywordChars.length})</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-swatch legend-swatch--alphabet"></span>
                        <span>Dopełnienie ({25 - keywordChars.length})</span>
                    </div>
                </div>
                <div className="playfair-matrix-note">
                    Litera <strong>J</strong> łączy się w jedno pole z literą <strong>I</strong>.
                </div>
            </div>
        </div>
    );
}
