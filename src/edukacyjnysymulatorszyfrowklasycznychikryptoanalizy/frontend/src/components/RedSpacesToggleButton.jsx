import React from 'react';

/**
 * Przycisk przełączający podświetlanie spacji na czerwono w szyfrogramie.
 */
export default function RedSpacesToggleButton({ enabled, onToggle }) {
    return (
        <button
            type="button"
            className={`red-spaces-toggle-btn ${enabled ? 'red-spaces-toggle-btn--active' : ''}`}
            onClick={onToggle}
            aria-pressed={enabled}
            title="Włącz lub wyłącz czerwone podświetlenie spacji w szyfrogramie"
        >
            {enabled ? 'Czerwone spacje: Wł.' : 'Czerwone spacje: Wył.'}
        </button>
    );
}
