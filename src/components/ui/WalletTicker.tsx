/**
 * WalletTicker - hobby money in the toolbar (collection mode), or a
 * "Free build" badge when playing with unlimited parts.
 */

import { useEffect, useRef, useState } from 'react';
import { Coins, Infinity as InfinityIcon } from 'lucide-react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { formatMoney } from '../../data/collection';
import './WalletTicker.css';

export function WalletTicker() {
    const mode = useCollectionStore(s => s.mode);
    const wallet = useCollectionStore(s => s.wallet);
    const previous = useRef(wallet);
    const [change, setChange] = useState<{ cents: number; key: number } | null>(null);

    // Show each payment or bill briefly as it lands
    useEffect(() => {
        const delta = wallet - previous.current;
        previous.current = wallet;
        if (delta === 0) return;
        setChange(c => ({ cents: delta, key: (c?.key ?? 0) + 1 }));
    }, [wallet]);

    if (mode === 'free') {
        return (
            <div className="wallet-ticker free" title="Free build: unlimited parts, no hobby money" data-testid="wallet">
                <InfinityIcon size={14} /> Free build
            </div>
        );
    }

    return (
        <div
            className={`wallet-ticker ${wallet < 0 ? 'in-debt' : ''}`}
            title="Hobby money: earned by running trains, spent in the hobby shop"
            data-testid="wallet"
        >
            <Coins size={14} />
            <span className="wallet-balance" data-testid="wallet-balance">{formatMoney(wallet)}</span>
            {change && (
                <span key={change.key} className={`wallet-income ${change.cents < 0 ? 'bill' : ''}`}>
                    {change.cents > 0 ? '+' : ''}{formatMoney(change.cents)}
                </span>
            )}
        </div>
    );
}
