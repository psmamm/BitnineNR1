import { Activity } from 'lucide-react';

interface HistoryTableProps {
    history: any[];
}

export function HistoryTable({ history }: HistoryTableProps) {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <Activity size={32} className="opacity-20" />
                <p>No history</p>
            </div>
        );
    }

    return (
        <div className="p-4 text-gray-400 text-sm">Trade history will be displayed here</div>
    );
}

