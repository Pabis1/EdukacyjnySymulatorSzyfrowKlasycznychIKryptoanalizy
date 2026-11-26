import React, { useRef } from 'react';

/**
 * Pole tekstowe z opcjonalnym podświetlaniem spacji na czerwono w tle.
 */
export default function HighlightableTextarea({
    highlightSpaces = false,
    className = 'text-area',
    value = '',
    onScroll,
    ...textareaProps
}) {
    const backdropRef = useRef(null);

    const handleScroll = (e) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
            backdropRef.current.scrollLeft = e.target.scrollLeft;
        }
        if (onScroll) {
            onScroll(e);
        }
    };

    if (!highlightSpaces) {
        return (
            <textarea
                className={className}
                value={value}
                onScroll={onScroll}
                {...textareaProps}
            />
        );
    }

    const segments = (value || '').split(/( )/);

    return (
        <div className="highlight-textarea-wrapper">
            <div
                ref={backdropRef}
                className={`${className} highlight-textarea-backdrop`}
                aria-hidden="true"
            >
                {segments.map((part, idx) =>
                    part === ' ' ? (
                        <mark key={idx} className="red-space-mark">
                            {' '}
                        </mark>
                    ) : (
                        <span key={idx} className="highlight-hidden-text">
                            {part}
                        </span>
                    ),
                )}
                {value.endsWith('\n') ? '\n' : null}
            </div>
            <textarea
                className={`${className} highlight-textarea-input`}
                value={value}
                onScroll={handleScroll}
                {...textareaProps}
            />
        </div>
    );
}
