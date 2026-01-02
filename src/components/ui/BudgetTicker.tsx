/**
 * BudgetTicker - Displays current budget in the toolbar
 */

import { useBudgetStore, formatCurrency } from '../../stores/useBudgetStore';
import './BudgetTicker.css';

export function BudgetTicker() {
    const { balance, totalSpent, startingBudget, reset } = useBudgetStore();

    // Calculate percentage remaining for visual indicator
    const percentRemaining = Math.round((balance / startingBudget) * 100);

    // Color based on budget health
    let statusClass = 'healthy';
    if (percentRemaining < 25) statusClass = 'danger';
    else if (percentRemaining < 50) statusClass = 'warning';

    return (
        <div className={`budget-ticker ${statusClass}`}>
            <span className="budget-balance" title="Current Balance">
                💰 {formatCurrency(balance)}
            </span>
            {totalSpent > 0 && (
                <span className="budget-spent" title="Total Spent">
                    (Spent: {formatCurrency(totalSpent)})
                </span>
            )}
            <button
                className="budget-reset"
                onClick={reset}
                title="Reset Budget"
            >
                🔄
            </button>
        </div>
    );
}
