/**
 * The hobby shop: a shelf of real boxed sets, and loose parts.
 *
 * Each box shows what's really inside (part numbers and quantities), the
 * layouts from its manual, and builds any of them on the table. In
 * collection mode boxes and parts cost hobby money, and a layout can only
 * be built from pieces the player owns.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { carColorAt, carKindAt, facesBack, getRollingStock, ROLLING_STOCK, trainLength, tractionOf, type RollingStock, type TrainBrand } from '../../../data/rollingStock';
import { getCarSprite, SPRITE_MARGIN } from '../../canvas/trains/carSprites';
import { scaleKmh } from '../../../simulation/driving';
import { SCALES, sizeOf } from '../../../config/scales';
import { ROLLING_STOCK as CAR } from '../../../config/rollingStock';
import { BRAND_NAMES, trackSystemName } from '../../../data/brands';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { getAllSets, resolvePlan, type LayoutPlan, type TrackSet } from '../../../data/sets';
import { getAllParts, getPartById, getPartsByBrand } from '../../../data/catalog';
import type { PartDefinition } from '../../../types';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useCollectionStore } from '../../../stores/useCollectionStore';
import { useShopStore } from '../../../stores/useShopStore';
import { useInventory } from '../../../hooks/useCollection';
import { formatMoney, shortfall, type PartCounts } from '../../../data/collection';
import { PlanPreview, PartPreview } from '../TrackPreview';
import { buildSetPlan } from './buildSetPlan';
import './SetShelf.css';


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
                    In the box: {set.rollingStock?.length ? 'a train and ' : ''}{pieceCount} pieces
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
                    {set.rollingStock?.map(id => {
                        const train = getRollingStock(id);
                        return train && (
                            <li key={id} className="train">
                                <span className="qty">1×</span> {train.name}, {train.carLengths.length} cars
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

/**
 * The train drawn from the same sprites the layout uses, to one scale:
 * the locomotive and up to two cars, at their real lengths.
 */
function TrainPreview({ stock }: { stock: RollingStock }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        // Over couplers at N size, as the sprites are drawn
        const cars = stock.carLengths.slice(0, 3).map(length => length / sizeOf(stock.scale));
        const px = canvas.width / (cars.reduce((sum, length) => sum + length, 0) + 2 * SPRITE_MARGIN);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Locomotive at the front (right), facing the way it drives
        let front = canvas.width - SPRITE_MARGIN * px;
        cars.forEach((overCouplers, i) => {
            const body = overCouplers - CAR.GAP;
            const kind = carKindAt({ stockId: stock.id }, i);
            const sprite = getCarSprite(kind, carColorAt({ stockId: stock.id, color: stock.color }, i), false, body, tractionOf({ stockId: stock.id }));
            if (!sprite) return;
            const w = (body + 2 * SPRITE_MARGIN) * px;
            const h = (sprite.height / sprite.width) * w;
            const x = front - (CAR.GAP / 2 + body + SPRITE_MARGIN) * px;
            const y = (canvas.height - h) / 2;
            if (facesBack(kind, i, false)) {
                // A power car at the far end faces away from the train
                ctx.save();
                ctx.translate(x + w, y);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, 0, 0, w, h);
                ctx.restore();
            } else {
                ctx.drawImage(sprite, x, y, w, h);
            }
            front -= overCouplers * px;
        });
    }, [stock]);
    return <canvas ref={ref} className="train-preview" width={320} height={48} aria-hidden="true" />;
}

const TRAIN_BRANDS: TrainBrand[] = ['kato', 'marklin', 'hornby', 'bachmann'];

/** "the 106-0018 starter set", naming the boxes a train comes in. */
function boxesNamed(setIds: string[]): string {
    return setIds.map(id => {
        const box = getAllSets().find(s => s.id === id);
        return box ? `${box.productCode} ${box.name}` : id;
    }).join(' or ');
}

/** Trains, each maker's real ones under its own heading, then the game's generic models. */
function TrainsForSale({ wallet }: { wallet: number }) {
    const ownedTrains = useCollectionStore(s => s.ownedTrains);
    const buyTrain = useCollectionStore(s => s.buyTrain);
    const groups: { key: string; title: string; note?: string; stock: RollingStock[] }[] = [
        ...TRAIN_BRANDS.map(brand => ({ key: brand, title: BRAND_NAMES[brand]?.maker ?? brand, stock: ROLLING_STOCK.filter(s => s.brand === brand) })),
        { key: 'generic', title: 'Generic trains', note: 'The game\'s own models rather than real products, sold on their own.', stock: ROLLING_STOCK.filter(s => s.generic) },
    ].filter(group => group.stock.length > 0);

    return (
        <>
            {groups.map(group => (
                <section key={group.key}>
                    <h3 className="set-shelf-section">{group.title}</h3>
                    {group.note && <p className="shop-section-note">{group.note}</p>}
                    <div className="shop-trains">
                        {group.stock.map(stock => (
                            <div className="shop-train" key={stock.id} data-testid={`shop-train-${stock.id}`}>
                                <TrainPreview stock={stock} />
                                <div className="shop-train-text">
                                    <span className="shop-part-name">{stock.name}</span>
                                    <span className="shop-part-code">
                                        {SCALES[stock.scale].label} · {stock.carLengths.length} cars, {Math.round(trainLength(stock) / 10)} cm long · top speed {Math.round(scaleKmh(stock.topSpeed, SCALES[stock.scale].ratio))} km/h · you have {ownedTrains[stock.id] ?? 0}
                                    </span>
                                    <span className="shop-train-description">{stock.description}</span>
                                </div>
                                {stock.price !== undefined ? (
                                    <>
                                        <span className="shop-part-price">{formatMoney(stock.price)}</span>
                                        <button onClick={() => buyTrain(stock.id)} disabled={wallet < stock.price} data-testid={`shop-buy-train-${stock.id}`}>
                                            Buy
                                        </button>
                                    </>
                                ) : (
                                    <span className="shop-train-in-box" data-testid={`shop-train-box-${stock.id}`}>
                                        Comes in {boxesNamed(stock.comesIn ?? [])}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}

function PartsForSale({ wallet, inventory }: { wallet: number; inventory: PartCounts }) {
    const buyPart = useCollectionStore(s => s.buyPart);
    // Every model track system, each under its own heading. Pieces without a
    // product number of their own only come in boxes.
    const systems = [...new Set(getAllParts().filter(p => p.scale !== 'wooden').map(p => p.brand))]
        .map(brand => ({ brand, parts: getPartsByBrand(brand).filter(p => p.productCode) }))
        .filter(system => system.parts.length > 0);
    return (
        <>
            {systems.map(({ brand, parts }) => (
                <section key={brand}>
                    <h3 className="set-shelf-section">{trackSystemName(brand)} · {SCALES[parts[0].scale].label}</h3>
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
                </section>
            ))}
        </>
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

    useDialogFocus(dialogRef);
    useEffect(() => {
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
        return { title: `${trackSystemName(brand)} · ${SCALES[onShelf[0].scale].label}`, sets: onShelf };
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

                {/* Focusable, so the shelf scrolls from the keyboard even when nothing on it can be bought */}
                <div className="set-shelf-body" tabIndex={0}>
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
