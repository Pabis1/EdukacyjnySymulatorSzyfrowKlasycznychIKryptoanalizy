import React from 'react';

/**
 * Przycisk przełączający sprawdzanie pisowni (czerwone podkreślenia) w polach tekstowych.
 */
export default function SpellcheckToggleButton({ enabled, onToggle }) {
    return (
        <button
            type="button"
            className={`spellcheck-toggle-btn ${!enabled ? 'spellcheck-toggle-btn--off' : ''}`}
            onClick={onToggle}
            aria-pressed={!enabled}
            title="Wyłącz lub włącz czerwone podkreślenia błędów pisowni w polu tekstowym"
        >
            {enabled ? 'Wyłącz czerwone podkreślenia' : 'Czerwone podkreślenia: Wył.'}
        </button>
    );
}
