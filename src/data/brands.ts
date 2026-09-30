/**
 * How each maker and its track system are named in the shop and on lists.
 */

import type { PartBrand } from './catalog/types';

export const BRAND_NAMES: Partial<Record<PartBrand, { maker: string; track: string }>> = {
    kato: { maker: 'Kato', track: 'Unitrack' },
    marklin: { maker: 'Märklin', track: 'C-track' },
    hornby: { maker: 'Hornby', track: 'Setrack' },
    tomix: { maker: 'Tomix', track: 'Fine Track' },
    brio: { maker: 'Brio', track: 'wooden railway' },
    ikea: { maker: 'IKEA', track: 'Lillabo' },
};

/** "Kato Unitrack", or the brand id for a maker without a name here. */
export function trackSystemName(brand: PartBrand): string {
    const name = BRAND_NAMES[brand];
    return name ? `${name.maker} ${name.track}` : brand;
}
