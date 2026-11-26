import React, { useState } from 'react';
import HighlightableTextarea from './HighlightableTextarea';
import RedSpacesToggleButton from './RedSpacesToggleButton';
import SpellcheckToggleButton from './SpellcheckToggleButton';

export default function NotesManagementPanel({
    onBack,
    notes = [],
    onAddNote,
    onDeleteNote,
    onTransferToAnalysis,
}) {
    const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCipherType, setNewCipherType] = useState('Szyfr Cezara');
    const [newContent, setNewContent] = useState('');
    const [newNotesText, setNewNotesText] = useState('');
    const [transferNotice, setTransferNotice] = useState('');
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
    const [highlightSpaces, setHighlightSpaces] = useState(false);

    const filteredNotes = notes.filter((n) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            n.title.toLowerCase().includes(query) ||
            n.cipherType.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            (n.notes && n.notes.toLowerCase().includes(query))
        );
    });

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) {
            return;
        }

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');

        const createdNote = {
            id: `note-${Date.now()}`,
            title: newTitle.trim(),
            cipherType: newCipherType,
            content: newContent.trim(),
            notes: newNotesText.trim(),
            createdAt: dateStr,
        };

        onAddNote(createdNote);
        setSelectedNoteId(createdNote.id);
        setIsCreating(false);
        setNewTitle('');
        setNewContent('');
        setNewNotesText('');
    };

    const handleTransfer = (noteToTransfer) => {
        if (!noteToTransfer || !noteToTransfer.content) return;
        setTransferNotice(`Przeniesiono notatkę "${noteToTransfer.title}" do modułu analizy!`);
        setTimeout(() => setTransferNotice(''), 3000);
        onTransferToAnalysis(noteToTransfer.content);
    };

    return (
        <div className="notes-management-page">
            <div className="back-bar">
                <button type="button" className="back-btn" onClick={onBack}>
                    ← Wróć do strony głównej
                </button>
            </div>

            <header className="header">
                <span className="badge badge--crypto">Panel Zarządzania</span>
                <h1 className="title">Zarządzanie Notatkami i Wykresami</h1>
                <p className="subtitle">
                    Przechowuj próbki badawcze, analizowane szyfrogramy i notatki z eksperymentów. Wybierz notatkę i przenieś ją bezpośrednio do modułu kryptoanalizy.
                </p>
            </header>

            {transferNotice && (
                <div className="transfer-alert" role="status">
                    {transferNotice}
                </div>
            )}

            <div className="notes-panel-layout">
                {/* Lewa kolumna: lista notatek i wyszukiwarka */}
                <aside className="notes-sidebar card">
                    <div className="notes-sidebar__header">
                        <div className="notes-sidebar__title-box">
                            <h2 className="notes-section-title">Zapisane Notatki</h2>
                            <span className="notes-count-badge">{notes.length}</span>
                        </div>
                        <button
                            type="button"
                            className="primary-button notes-add-btn"
                            onClick={() => setIsCreating((prev) => !prev)}
                        >
                            {isCreating ? 'Anuluj dodawanie' : '+ Nowa notatka'}
                        </button>
                    </div>

                    <div className="notes-search-box">
                        <input
                            type="text"
                            className="text-input notes-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Szukaj w notatkach..."
                        />
                    </div>

                    {isCreating && (
                        <form className="new-note-form" onSubmit={handleCreateSubmit}>
                            <h3 className="new-note-form__title">Dodaj nową notatkę</h3>

                            <div className="field">
                                <label className="label" htmlFor="new-note-title">Tytuł notatki</label>
                                <input
                                    id="new-note-title"
                                    type="text"
                                    className="text-input"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="np. Przechwycona wiadomość Cezara..."
                                    required
                                />
                            </div>

                            <div className="field">
                                <label className="label" htmlFor="new-note-type">Typ szyfru / Kategoria</label>
                                <select
                                    id="new-note-type"
                                    className="select-input"
                                    value={newCipherType}
                                    onChange={(e) => setNewCipherType(e.target.value)}
                                >
                                    <option value="Szyfr Cezara">Szyfr Cezara</option>
                                    <option value="Szyfr Vigenère’a">Szyfr Vigenère’a</option>
                                    <option value="Tekst jawny">Tekst jawny</option>
                                    <option value="Inny / Własny">Inny / Własny</option>
                                </select>
                            </div>

                            <div className="field">
                                <div className="field__header">
                                    <label className="label" htmlFor="new-note-content">Szyfrogram / Dane (Ciphertext)</label>
                                    <div className="field__header-actions">
                                        <RedSpacesToggleButton
                                            enabled={highlightSpaces}
                                            onToggle={() => setHighlightSpaces((prev) => !prev)}
                                        />
                                        <SpellcheckToggleButton
                                            enabled={spellCheckEnabled}
                                            onToggle={() => setSpellCheckEnabled((prev) => !prev)}
                                        />
                                    </div>
                                </div>
                                <HighlightableTextarea
                                    id="new-note-content"
                                    className="text-area"
                                    rows={3}
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="Wklej tekst lub dane szyfrogramu..."
                                    spellCheck={spellCheckEnabled}
                                    highlightSpaces={highlightSpaces}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label className="label" htmlFor="new-note-notes">Własne spostrzeżenia / Notatki</label>
                                <textarea
                                    id="new-note-notes"
                                    className="text-area"
                                    rows={2}
                                    value={newNotesText}
                                    onChange={(e) => setNewNotesText(e.target.value)}
                                    placeholder="Opcjonalne uwagi kryptoanalityczne..."
                                    spellCheck={false}
                                />
                            </div>

                            <div className="new-note-form__actions">
                                <button type="submit" className="primary-button">
                                    Zapisz notatkę
                                </button>
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="notes-items-list" role="list">
                        {filteredNotes.length === 0 ? (
                            <div className="notes-empty-state">
                                Brak notatek spełniających kryteria wyszukiwania.
                            </div>
                        ) : (
                            filteredNotes.map((note) => {
                                const isSelected = selectedNote?.id === note.id;
                                return (
                                    <div
                                        key={note.id}
                                        role="button"
                                        tabIndex={0}
                                        className={`note-list-item ${isSelected ? 'note-list-item--active' : ''}`}
                                        onClick={() => setSelectedNoteId(note.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedNoteId(note.id);
                                            }
                                        }}
                                    >
                                        <div className="note-list-item__top">
                                            <span className="note-list-item__title">{note.title}</span>
                                            <span className="note-list-item__badge">{note.cipherType}</span>
                                        </div>
                                        <p className="note-list-item__preview">{note.content}</p>
                                        <div className="note-list-item__footer">
                                            <span className="note-list-item__date">{note.createdAt}</span>
                                            <span className="note-list-item__chars">{note.content.length} znaków</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Prawa kolumna: Szczegóły wybranej notatki i przycisk "Przenieś do analizy" */}
                <main className="notes-detail-view card">
                    {selectedNote ? (
                        <div className="note-inspector">
                            <div className="note-inspector__header">
                                <div>
                                    <div className="note-inspector__meta">
                                        <span className="badge badge--crypto">{selectedNote.cipherType}</span>
                                        <span className="note-inspector__date">Utworzono: {selectedNote.createdAt}</span>
                                    </div>
                                    <h2 className="note-inspector__title">{selectedNote.title}</h2>
                                </div>

                                <div className="note-inspector__top-actions">
                                    <button
                                        type="button"
                                        className="primary-button transfer-primary-btn"
                                        onClick={() => handleTransfer(selectedNote)}
                                        title="Przenieś aktualnie wybraną notatkę do modułu kryptoanalizy"
                                    >
                                        Przenieś do analizy →
                                    </button>
                                </div>
                            </div>

                            <div className="note-inspector__section">
                                <div className="field__header">
                                    <label className="label">
                                        Aktualnie wybrana notatka / Dane szyfrogramu:
                                    </label>
                                    <div className="field__header-actions">
                                        <RedSpacesToggleButton
                                            enabled={highlightSpaces}
                                            onToggle={() => setHighlightSpaces((prev) => !prev)}
                                        />
                                        <span className="char-count-badge">
                                            Długość: <strong>{selectedNote.content.length}</strong> znaków
                                        </span>
                                    </div>
                                </div>
                                <div className="note-content-box">
                                    <pre className="note-content-text">
                                        {highlightSpaces
                                            ? selectedNote.content.split(/( )/).map((part, idx) =>
                                                  part === ' ' ? (
                                                      <mark key={idx} className="red-space-mark">
                                                          {' '}
                                                      </mark>
                                                  ) : (
                                                      part
                                                  ),
                                              )
                                            : selectedNote.content}
                                    </pre>
                                </div>
                            </div>

                            {selectedNote.notes && (
                                <div className="note-inspector__section">
                                    <label className="label">Notatki analityczne i hipotezy:</label>
                                    <div className="note-observations-box">
                                        <p>{selectedNote.notes}</p>
                                    </div>
                                </div>
                            )}

                            <div className="note-inspector__footer-actions">
                                <button
                                    type="button"
                                    className="primary-button transfer-main-btn"
                                    onClick={() => handleTransfer(selectedNote)}
                                >
                                    Przenieś do analizy
                                </button>
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedNote.content);
                                    }}
                                >
                                    Kopiuj treść
                                </button>
                                {notes.length > 1 && onDeleteNote && (
                                    <button
                                        type="button"
                                        className="danger-button"
                                        onClick={() => onDeleteNote(selectedNote.id)}
                                    >
                                        Usuń notatkę
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="note-inspector--empty">
                            <h3>Brak wybranej notatki</h3>
                            <p>Wybierz notatkę z listy po lewej stronie lub dodaj nową, aby wyświetlić szczegóły i przenieść dane do analizy.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
