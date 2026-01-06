import { Activity, X } from 'lucide-react';

interface Position {
    id: string;
    symbol: string;
    type: 'Long' | 'Short';
    leverage: number;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    pnlPercent: number;
    takeProfit?: number;
    stopLoss?: number;
    commission: number;
}

interface PositionsTableProps {
    positions: Position[];
    exchangeOutage: boolean;
    onClosePosition: (id: string) => void;
}

export function PositionsTable({ positions, exchangeOutage, onClosePosition }: PositionsTableProps) {
    if (positions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <Activity size={32} className="opacity-20" />
                <p>No open positions</p>
            </div>
        );
    }

    return (
        <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#2A2E39]/50 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                    <th className="px-4 py-2 font-medium">Symbol</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Size</th>
                    <th className="px-4 py-2 font-medium">Avg. Entry</th>
                    <th className="px-4 py-2 font-medium">Take Profit</th>
                    <th className="px-4 py-2 font-medium">Stop Loss</th>
                    <th className="px-4 py-2 font-medium">P&L</th>
                    <th className="px-4 py-2 font-medium">Realized P&L</th>
                    <th className="px-4 py-2 font-medium">Strategy</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                            <span className="font-bold text-white">{pos.symbol}</span>
                        </td>
                        <td className="px-4 py-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                pos.type === 'Long' 
                                    ? 'bg-[#2EBD85]/20 text-[#2EBD85]' 
                                    : 'bg-[#F6465D]/20 text-[#F6465D]'
                            }`}>
                                {pos.type} {pos.leverage}x
                            </span>
                        </td>
                        <td className="px-4 py-3 text-white">{pos.size}</td>
                        <td className="px-4 py-3 text-white">
                            ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                            {pos.takeProfit 
                                ? `$${pos.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                                : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                            {pos.stopLoss 
                                ? `$${pos.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                                : '-'}
                        </td>
                        <td className="px-4 py-3">
                            <span className={`font-medium ${pos.pnl >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
                                {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">-</td>
                        <td className="px-4 py-3 text-gray-400">-</td>
                        <td className="px-4 py-3 text-right">
                            <button
                                onClick={() => onClosePosition(pos.id)}
                                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"
                                disabled={exchangeOutage}
                            >
                                <X size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

