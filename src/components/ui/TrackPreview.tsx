/**
 * Small SVG drawings of real track: a whole layout plan (on a set's box) or
 * a single part (in the parts bin). Both are drawn from the track creators,
 * so they show the true shape of what will be placed.
 */

import { memo, useMemo } from 'react';
import type { LayoutPlan } from '../../data/sets';
import type { PartDefinition } from '../../types';
import { planShapes } from './planShapes';

export const PlanPreview = memo(function PlanPreview({ plan }: { plan: LayoutPlan }) {
    const shapes = useMemo(() => planShapes(plan), [plan]);
    return (
        <svg className="set-plan-preview" viewBox={shapes.viewBox} role="img" aria-label={`${plan.name} track plan`}>
            {shapes.paths.map((d, i) => <path key={i} d={d} className="set-plan-ballast" />)}
            {shapes.paths.map((d, i) => <path key={`r${i}`} d={d} className="set-plan-rail" />)}
            {shapes.bumpers.map((d, i) => <path key={`b${i}`} d={d} className="set-plan-bumper" />)}
        </svg>
    );
});

export const PartPreview = memo(function PartPreview({ part }: { part: PartDefinition }) {
    const shapes = useMemo(
        () => planShapes({ id: part.id, name: part.name, steps: [{ part: part.id }] }, 12),
        [part]
    );
    return (
        <svg className="part-preview" viewBox={shapes.viewBox} aria-hidden="true">
            {shapes.paths.map((d, i) => <path key={i} d={d} className="part-preview-bed" />)}
            {shapes.paths.map((d, i) => <path key={`r${i}`} d={d} className="part-preview-rail" />)}
            {shapes.bumpers.map((d, i) => <path key={`b${i}`} d={d} className="part-preview-bumper" />)}
        </svg>
    );
});
