import { Activity } from 'lucide-react';

interface OrdersTableProps {
    orders: any[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <Activity size={32} className="opacity-20" />
                <p>No orders</p>
            </div>
        );
    }

    return (
        <div className="p-4 text-gray-400 text-sm">Orders will be displayed here</div>
    );
}

