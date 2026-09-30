/**
 * Sharing layouts by link: the toolbar's Share button, and opening a link
 * someone shared (`#layout=…`) when the page loads.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Link2, X } from 'lucide-react';
import { useTrackStore } from '../../../stores/useTrackStore';
import {
    decodeLayout, encodeLayout, layoutCodeIn, layoutPieces, shareUrl, SharedLayoutError,
} from '../../../utils/shareLayout';
import type { TemplatePart } from '../../../data/templates/types';
import { openSharedLayout } from './openSharedLayout';
import '../SetShelf/SetShelf.css';
import './ShareLayout.css';

export function ShareLayoutButton() {
    const hasTrack = useTrackStore(s => Object.keys(s.edges).length > 0);
    const [link, setLink] = useState<string | null>(null);

    const share = async () => {
        const { edges, nodes } = useTrackStore.getState();
        setLink(shareUrl(await encodeLayout(layoutPieces(edges, nodes)), window.location));
    };

    return (
        <>
            <button
                onClick={share}
                disabled={!hasTrack}
                title={hasTrack ? 'Share: a link to this layout' : 'Share: build something first'}
                className="toolbar-btn-icon"
                data-testid="share-layout"
            >
                <Link2 size={16} />
            </button>
            {link && createPortal(<ShareDialog link={link} onClose={() => setLink(null)} />, document.body)}
        </>
    );
}

function ShareDialog({ link, onClose }: { link: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.select();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            // No clipboard (an insecure page, or permission refused): the link is selected to copy by hand
            inputRef.current?.select();
        }
    };

    return (
        <div className="set-shelf-overlay" onClick={onClose}>
            <div className="set-shelf share-dialog" role="dialog" aria-modal="true" aria-label="Share layout" onClick={e => e.stopPropagation()} data-testid="share-dialog">
                <header className="set-shelf-header">
                    <div>
                        <h2>Share this layout</h2>
                        <p>Anyone with the link can open a copy of your track. Trains and wiring aren't included.</p>
                    </div>
                    <button className="set-shelf-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </header>
                <div className="share-dialog-body">
                    <input ref={inputRef} readOnly value={link} aria-label="Link to this layout" data-testid="share-link" onFocus={e => e.target.select()} />
                    <button className="primary" onClick={copy} data-testid="share-copy">
                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Opens a shared layout in the page's link, asking first if it would replace something. */
export function SharedLayoutHost() {
    const [pending, setPending] = useState<TemplatePart[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const openFromLink = () => {
            const code = layoutCodeIn(window.location.hash);
            if (!code) return;
            // Drop the fragment so a reload doesn't open it again over later work
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            decodeLayout(code).then(pieces => {
                if (Object.keys(useTrackStore.getState().edges).length === 0) openSharedLayout(pieces);
                else setPending(pieces);
            }).catch((e: unknown) => {
                setError(e instanceof SharedLayoutError ? e.message : "This link's layout couldn't be opened.");
            });
        };
        // On load, and when a link is pasted into a tab with the game already open
        openFromLink();
        window.addEventListener('hashchange', openFromLink);
        return () => window.removeEventListener('hashchange', openFromLink);
    }, []);

    if (error) {
        return createPortal(
            <div className="set-shelf-overlay">
                <div className="set-shelf share-dialog" role="alertdialog" aria-label="Shared layout" data-testid="shared-layout-error">
                    <header className="set-shelf-header">
                        <div>
                            <h2>Couldn't open the shared layout</h2>
                            <p>{error}</p>
                        </div>
                    </header>
                    <div className="share-dialog-actions">
                        <button className="primary" onClick={() => setError(null)}>OK</button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }
    if (!pending) return null;
    return createPortal(
        <div className="set-shelf-overlay">
            <div className="set-shelf share-dialog" role="alertdialog" aria-label="Open shared layout" data-testid="shared-layout-prompt">
                <header className="set-shelf-header">
                    <div>
                        <h2>Open the shared layout?</h2>
                        <p>
                            It has {pending.length} pieces, and replaces what's on the table; Undo brings your
                            layout back. It opens in free build, since it isn't your collection.
                        </p>
                    </div>
                </header>
                <div className="share-dialog-actions">
                    <button onClick={() => setPending(null)} data-testid="shared-layout-cancel">Keep mine</button>
                    <button className="primary" onClick={() => { openSharedLayout(pending); setPending(null); }} data-testid="shared-layout-open">
                        Open it
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
