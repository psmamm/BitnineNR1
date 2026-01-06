import { getDivisionColor } from '@/react-app/hooks/useELO';

interface ELOBadgeProps {
    elo: number;
    division: string;
    showChange?: number;
    size?: 'sm' | 'md' | 'lg';
}

export default function ELOBadge({ elo, division, showChange, size = 'md' }: ELOBadgeProps) {
    const divisionColor = getDivisionColor(division);
    
    const sizeClasses = {
        sm: 'text-sm px-2 py-1',
        md: 'text-base px-3 py-1.5',
        lg: 'text-lg px-4 py-2'
    };

    return (
        <div className={`inline-flex items-center gap-2 ${sizeClasses[size]}`}>
            <span 
                className="font-bold"
                style={{ color: divisionColor }}
            >
                {elo}
            </span>
            <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ 
                    backgroundColor: `${divisionColor}20`,
                    color: divisionColor
                }}
            >
                {division}
            </span>
            {showChange !== undefined && showChange !== 0 && (
                <span className={`text-xs ${showChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {showChange > 0 ? '+' : ''}{showChange}
                </span>
            )}
        </div>
    );
}

