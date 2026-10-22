import React, { useState } from 'react';

export default function App() {
    const [text, setText] = useState('');
    const [shift, setShift] = useState(3);
    const [ciphertext, setCiphertext] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleEncrypt = async () => {
        setError('');
        setCiphertext('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/v1/caesar/encrypt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    shift: Number(shift)
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let errorMsg = 'Serwer zwrócił błąd.';
                if (errData.detail) {
                    if (Array.isArray(errData.detail)) {
                        errorMsg = errData.detail.map(e => e.msg).join(', ');
                    } else {
                        errorMsg = errData.detail;
                    }
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

            const data = await response.json();
            const resultText = typeof data === 'string'
                ? data
                : (data.ciphertext || data.result || data.text || JSON.stringify(data));

            setCiphertext(resultText);
        } catch (err) {
            setError('Nie udało się połączyć z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (ciphertext) {
            navigator.clipboard.writeText(ciphertext);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <span style={{
            backgroundColor: '#312e81',
            color: '#818cf8',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        }}>
          Symulator Kryptograficzny
        </span>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '12px', marginBottom: '6px' }}>
                    Szyfr Cezara
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                    Eksperymentuj z tekstem i kluczem, aby zobaczyć, jak działa kryptoanaliza klasyczna.
                </p>
            </div>

            <div style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                border: '1px solid #334155',
                padding: '30px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
            }}>

                <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>
                        Tekst jawny (Plaintext)
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Wpisz wiadomość do zaszyfrowania..."
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '15px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '26px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>
                            Klucz przesunięcia
                        </label>
                        <span style={{
                            backgroundColor: '#312e81',
                            color: '#818cf8',
                            padding: '2px 10px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}>
              +{shift}
            </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="31"
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                        style={{
                            width: '100%',
                            accentColor: '#6366f1',
                            cursor: 'pointer',
                            height: '6px'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        <span>1</span>
                        <span>15</span>
                        <span>31</span>
                    </div>
                </div>

                <button
                    onClick={handleEncrypt}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '13px',
                        backgroundColor: loading ? '#4f46e5' : '#6366f1',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                    }}
                >
                    {loading ? 'Przetwarzanie...' : 'Zaszyfruj wiadomość'}
                </button>

                {error && (
                    <div style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '13px'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ marginTop: '26px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>
                            Szyfrogram (Ciphertext)
                        </label>
                        {ciphertext && (
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#818cf8',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {copied ? '✓ Skopiowano!' : 'Kopiuj'}
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        readOnly
                        value={ciphertext}
                        placeholder="Wynik pojawi się tutaj..."
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#34d399',
                            fontSize: '15px',
                            fontWeight: '500',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

            </div>

            <footer style={{ marginTop: '30px', color: '#64748b', fontSize: '12px' }}>
                Edukacyjny Symulator Szyfrów Klasycznych
            </footer>
        </div>
    );
}