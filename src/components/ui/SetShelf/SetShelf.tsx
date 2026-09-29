/**
 * The hobby shop: a shelf of real boxed sets, and loose parts.
 *
 * Each box shows what's really inside (part numbers and quantities), the
 * layouts from its manual, and builds any of them on the table. In
 * collection mode boxes and parts cost hobby money, and a layout can only
 * be built from pieces the player owns.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ROLLING_STOCK, type RollingStock } from '../../../data/rollingStock';
import { getCarSprite } from '../../canvas/trains/carSprites';
import { scaleKmh } from '../../../simulation/driving';
import { SCALES } from '../../../config/scales';
import type { PartBrand } from '../../../data/catalog/types';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { getAllSets, resolvePlan, type LayoutPlan, type TrackSet } from '../../../data/sets';
import { getPartById, getPartsByScale } from '../../../data/catalog';
import type { PartDefinition } from '../../../types';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useCollectionStore } from '../../../stores/useCollectionStore';
import { useShopStore } from '../../../stores/useShopStore';
import { useInventory } from '../../../hooks/useCollection';
import { formatMoney, shortfall, type PartCounts } from '../../../data/collection';
import { PlanPreview, PartPreview } from '../TrackPreview';
import { buildSetPlan } from './buildSetPlan';
import './SetShelf.css';

/** How each maker and its track system are named on the shelf. */
const BRAND_NAMES: Partial<Record<PartBrand, { maker: string; track: string }>> = {
    kato: { maker: 'Kato', track: 'Unitrack' },
    marklin: { maker: 'Märklin', track: 'C-track' },
    hornby: { maker: 'Hornby', track: 'Setrack' },
    tomix: { maker: 'Tomix', track: 'Fine Track' },
    brio: { maker: 'Brio', track: 'wooden railway' },
    ikea: { maker: 'IKEA', track: 'Lillabo' },
};

function partLabel(partId: string): { name: string; code?: string } {
    const part = getPartById(partId);
    return { name: part?.name ?? partId, code: part?.productCode };
}

/** "6× Straight 248mm, 2× Curve R718-15°" (at most three kinds). */
function describeMissing(missing: PartCounts): string {
    const lines = Object.entries(missing).map(([id, n]) => `${n}× ${partLabel(id).name}`);
    return lines.length > 3 ? `${lines.slice(0, 3).join(', ')} and more` : lines.join(', ');
}

interface SetBoxProps {
    set: TrackSet;
    inCollection: boolean;
    owned: number;
    wallet: number;
    inventory: PartCounts;
    onBuild: (plan: LayoutPlan) => void;
    onBuy: () => void;
}

function SetBox({ set, inCollection, owned, wallet, inventory, onBuild, onBuy }: SetBoxProps) {
    const [planIndex, setPlanIndex] = useState(0);
    const plan = set.plans[planIndex] ?? set.plans[0];
    const pieceCount = set.contents.reduce((n, item) => n + item.qty, 0);
    const missing = useMemo(
        () => (inCollection ? shortfall(resolvePlan(plan).billOfMaterials, inventory) : {}),
        [inCollection, plan, inventory]
    );
    const canBuild = Object.keys(missing).length === 0;
    const price = set.price;

    return (
        <article className={`set-box set-box-${set.brand}`} data-testid={`set-box-${set.id}`}>
            <header className="set-box-lid">
                <span className="set-box-brand">{BRAND_NAMES[set.brand]?.maker ?? set.brand}</span>
                {set.badge && <span className="set-box-badge">{set.badge}</span>}
                {set.productCode !== set.badge && <span className="set-box-code">{set.productCode}</span>}
            </header>
            <h3 className="set-box-name">{set.name}</h3>
            <p className="set-box-description">{set.description}</p>

            <PlanPreview plan={plan} />

            {set.plans.length > 1 && (
                <div className="set-box-plans" role="tablist" aria-label="Layouts in the manual">
                    {set.plans.map((p, i) => (
                        <button
                            key={p.id}
                            role="tab"
                            aria-selected={i === planIndex}
                            className={i === planIndex ? 'active' : ''}
                            onClick={() => setPlanIndex(i)}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
            {plan.description && <p className="set-box-plan-description">{plan.description}</p>}

            <details className="set-box-contents">
                <summary>
                    In the box: {pieceCount} pieces
                    {set.footprint && (set.footprint.space
                        ? <> · needs {set.footprint.width / 10} × {set.footprint.depth / 10} cm</>
                        : <> · {set.footprint.width} × {set.footprint.depth} mm</>)}
                </summary>
                <ul>
                    {set.contents.map(item => {
                        const { name, code } = partLabel(item.part);
                        return (
                            <li key={item.part}>
                                <span className="qty">{item.qty}×</span> {name}
                                {code && <span className="code"> {code}</span>}
                            </li>
                        );
                    })}
                    {set.accessories?.map(a => <li key={a} className="accessory">{a}</li>)}
                </ul>
                {set.extends && set.extends.length > 0 && (
                    <p className="set-box-extends">Builds on: {set.extends.map(id => getAllSets().find(s => s.id === id)?.badge ?? id).join(', ')}</p>
                )}
            </details>

            {inCollection && (
                <div className="set-box-shop">
                    <span className="set-box-price">{price !== undefined ? formatMoney(price) : 'Not sold'}</span>
                    {owned > 0 && <span className="set-box-owned" data-testid={`set-owned-${set.id}`}>Owned ×{owned}</span>}
                    {price !== undefined && (
                        <button
                            className="set-box-buy"
                            onClick={onBuy}
                            disabled={wallet < price}
                            title={wallet < price ? `You have ${formatMoney(wallet)}: run your trains to earn more` : undefined}
                            data-testid={`set-buy-${set.id}`}
                        >
                            Buy
                        </button>
                    )}
                </div>
            )}

            <button
                className="set-box-build"
                onClick={() => onBuild(plan)}
                disabled={!canBuild}
                data-testid={`set-build-${set.id}`}
            >
                Build this layout
            </button>
            {!canBuild && (
                <p className="set-box-missing" data-testid={`set-missing-${set.id}`}>
                    You still need {describeMissing(missing)}.
                </p>
            )}
        </article>
    );
}

/** One loose part for sale. */
function PartForSale({ part, owned, wallet, onBuy }: { part: PartDefinition; owned: number; wallet: number; onBuy: () => void }) {
    return (
        <div className="shop-part" data-testid={`shop-part-${part.id}`}>
            <PartPreview part={part} />
            <div className="shop-part-text">
                <span className="shop-part-name">{part.name}</span>
                <span className="shop-part-code">{part.productCode} · you have {owned}</span>
            </div>
            <span className="shop-part-price">{formatMoney(part.cost)}</span>
            <button onClick={onBuy} disabled={wallet < part.cost} data-testid={`shop-buy-${part.id}`}>
                Buy
            </button>
        </div>
    );
}

/** The train drawn from the same sprites the layout uses: locomotive and up to three cars. */
function TrainPreview({ stock }: { stock: RollingStock }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        const loco = getCarSprite('loco', stock.color);
        const coach = getCarSprite('coach', stock.color);
        if (!canvas || !ctx || !loco || !coach) return;
        const shown = Math.min(stock.cars, 4);
        const w = canvas.width / shown;
        const h = (loco.height / loco.width) * w;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < shown; i++) {
            // Locomotive at the front (right), facing the way it drives
            ctx.drawImage(i === 0 ? loco : coach, canvas.width - (i + 1) * w, (canvas.height - h) / 2, w, h);
        }
    }, [stock]);
    return <canvas ref={ref} className="train-preview" width={320} height={48} aria-hidden="true" />;
}

function TrainsForSale({ wallet }: { wallet: number }) {
    const ownedTrains = useCollectionStore(s => s.ownedTrains);
    const buyTrain = useCollectionStore(s => s.buyTrain);
    return (
        <div className="shop-trains">
            {ROLLING_STOCK.map(stock => (
                <div className="shop-train" key={stock.id} data-testid={`shop-train-${stock.id}`}>
                    <TrainPreview stock={stock} />
                    <div className="shop-train-text">
                        <span className="shop-part-name">{stock.name}</span>
                        <span className="shop-part-code">
                            {SCALES[stock.scale].label} · {stock.cars} cars · top speed {Math.round(scaleKmh(stock.topSpeed, SCALES[stock.scale].ratio))} km/h · you have {ownedTrains[stock.id] ?? 0}
                        </span>
                        <span className="shop-train-description">{stock.description}</span>
                    </div>
                    <span className="shop-part-price">{formatMoney(stock.price)}</span>
                    <button onClick={() => buyTrain(stock.id)} disabled={wallet < stock.price} data-testid={`shop-buy-train-${stock.id}`}>
                        Buy
                    </button>
                </div>
            ))}
        </div>
    );
}

function PartsForSale({ wallet, inventory }: { wallet: number; inventory: PartCounts }) {
    const buyPart = useCollectionStore(s => s.buyPart);
    // Pieces without a product number of their own only come in boxes
    const parts = getPartsByScale('n-scale').filter(p => p.productCode);
    return (
        <div className="shop-parts">
            {parts.map(part => (
                <PartForSale
                    key={part.id}
                    part={part}
                    owned={inventory[part.id] ?? 0}
                    wallet={wallet}
                    onBuy={() => buyPart(part.id)}
                />
            ))}
        </div>
    );
}

export function SetShelf({ onClose }: { onClose: () => void }) {
    const sets = getAllSets();
    const hasLayout = useTrackStore(s => Object.keys(s.edges).length > 0);
    const mode = useCollectionStore(s => s.mode);
    const wallet = useCollectionStore(s => s.wallet);
    const ownedSets = useCollectionStore(s => s.ownedSets);
    const buySet = useCollectionStore(s => s.buySet);
    const tab = useShopStore(s => s.tab);
    const setTab = useShopStore(s => s.setTab);
    const inventory = useInventory();
    const inCollection = mode === 'collection';
    const [pending, setPending] = useState<{ set: TrackSet; plan: LayoutPlan } | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const build = (set: TrackSet, plan: LayoutPlan) => {
        buildSetPlan(set, plan);
        onClose();
    };

    // One shelf per track system, starter sets first on each
    const sections = [...new Set(sets.map(s => s.brand))].map(brand => {
        const onShelf = sets.filter(s => s.brand === brand);
        const name = BRAND_NAMES[brand];
        return {
            title: `${name ? `${name.maker} ${name.track}` : brand} · ${SCALES[onShelf[0].scale].label}`,
            sets: onShelf,
        };
    });

    const showParts = inCollection && tab === 'parts';
    const showTrains = inCollection && tab === 'trains';

    return (
        <div className="set-shelf-overlay" onClick={onClose}>
            <div
                className="set-shelf"
                role="dialog"
                aria-modal="true"
                aria-label={inCollection ? 'Hobby shop' : 'Train sets'}
                tabIndex={-1}
                ref={dialogRef}
                onClick={e => e.stopPropagation()}
                data-testid="set-shelf"
            >
                <header className="set-shelf-header">
                    <div>
                        <h2>{inCollection ? 'Hobby shop' : 'Train sets'}</h2>
                        <p>
                            {inCollection
                                ? <>Real boxes with the exact track inside. You have <strong data-testid="shop-wallet">{formatMoney(wallet)}</strong>; running trains earns more.</>
                                : 'Real boxes with the exact track inside. Pick one and build the layout from its manual.'}
                        </p>
                    </div>
                    <button className="set-shelf-close" onClick={onClose} aria-label="Close" data-testid="set-shelf-close">
                        <X size={18} />
                    </button>
                </header>

                {inCollection && (
                    <div className="shop-tabs" role="tablist">
                        <button role="tab" aria-selected={!showParts && !showTrains} className={!showParts && !showTrains ? 'active' : ''} onClick={() => setTab('sets')} data-testid="shop-tab-sets">
                            Boxed sets
                        </button>
                        <button role="tab" aria-selected={showParts} className={showParts ? 'active' : ''} onClick={() => setTab('parts')} data-testid="shop-tab-parts">
                            Loose parts
                        </button>
                        <button role="tab" aria-selected={showTrains} className={showTrains ? 'active' : ''} onClick={() => setTab('trains')} data-testid="shop-tab-trains">
                            Trains
                        </button>
                    </div>
                )}

                {pending && (
                    <div className="set-shelf-confirm" role="alertdialog" aria-label="Replace layout">
                        <span>Building <strong>{pending.set.badge ?? pending.set.productCode} · {pending.plan.name}</strong> replaces what's on the table. Undo brings it back.</span>
                        <button onClick={() => setPending(null)}>Cancel</button>
                        <button className="primary" onClick={() => build(pending.set, pending.plan)} data-testid="set-build-confirm">
                            Build
                        </button>
                    </div>
                )}

                <div className="set-shelf-body">
                    {showTrains ? (
                        <TrainsForSale wallet={wallet} />
                    ) : showParts ? (
                        <PartsForSale wallet={wallet} inventory={inventory} />
                    ) : sections.map(section => (
                        <section key={section.title}>
                            <h3 className="set-shelf-section">{section.title}</h3>
                            <div className="set-shelf-grid">
                                {section.sets.map(set => (
                                    <SetBox
                                        key={set.id}
                                        set={set}
                                        inCollection={inCollection}
                                        owned={ownedSets[set.id] ?? 0}
                                        wallet={wallet}
                                        inventory={inventory}
                                        onBuy={() => buySet(set.id)}
                                        onBuild={plan => (hasLayout ? setPending({ set, plan }) : build(set, plan))}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Toolbar button that opens the shop. */
export function SetShelfButton() {
    const openShop = useShopStore(s => s.openShop);
    const mode = useCollectionStore(s => s.mode);
    return (
        <button
            onClick={() => openShop('sets')}
            title={mode === 'collection' ? 'Hobby shop' : 'Train sets'}
            className="toolbar-btn-icon"
            data-testid="open-set-shelf"
        >
            <Package size={16} />
        </button>
    );
}

/** Renders the shop when it's open (mounted once, in App). */
export function ShopHost() {
    const open = useShopStore(s => s.open);
    const closeShop = useShopStore(s => s.closeShop);
    return open ? createPortal(<SetShelf onClose={closeShop} />, document.body) : null;
}
