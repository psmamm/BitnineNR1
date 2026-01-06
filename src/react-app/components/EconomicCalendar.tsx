import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  previous?: string;
  forecast?: string;
  actual?: string;
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Mock data for now - can be replaced with real API later
    const mockEvents: EconomicEvent[] = [
      {
        id: '1',
        title: 'US Non-Farm Payrolls',
        country: 'USD',
        time: '14:30',
        impact: 'high',
        previous: '150K',
        forecast: '180K',
      },
      {
        id: '2',
        title: 'CPI (Consumer Price Index)',
        country: 'USD',
        time: '14:30',
        impact: 'high',
        previous: '3.2%',
        forecast: '3.4%',
      },
      {
        id: '3',
        title: 'GDP Growth Rate',
        country: 'EUR',
        time: '11:00',
        impact: 'medium',
        previous: '0.3%',
        forecast: '0.4%',
      },
      {
        id: '4',
        title: 'Interest Rate Decision',
        country: 'GBP',
        time: '13:00',
        impact: 'high',
        previous: '5.25%',
        forecast: '5.25%',
      },
    ];

    setTimeout(() => {
      setEvents(mockEvents);
      setLoading(false);
    }, 500);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-[#6A3DF4]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Economic Calendar</h3>
          <p className="text-[#7F8C8D] text-xs">Upcoming market events</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6A3DF4]"></div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No events scheduled for today</p>
            </div>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0D0F18] rounded-lg p-4 border border-white/5 hover:border-[#6A3DF4]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm mb-1">{event.title}</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span className="font-medium text-[#6A3DF4]">{event.country}</span>
                      <span>•</span>
                      <span>{event.time}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColor(
                      event.impact
                    )}`}
                  >
                    {event.impact.toUpperCase()}
                  </span>
                </div>
                {(event.previous || event.forecast || event.actual) && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                    {event.previous && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Previous</p>
                        <p className="text-sm text-gray-300">{event.previous}</p>
                      </div>
                    )}
                    {event.forecast && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Forecast</p>
                        <p className="text-sm text-white font-medium">{event.forecast}</p>
                      </div>
                    )}
                    {event.actual && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Actual</p>
                        <p className="text-sm text-green-400 font-medium">{event.actual}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

