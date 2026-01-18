import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Calendar, Plus } from "lucide-react";

interface Option {
    value: string;
    label?: string;
    name?: string;
    [key: string]: unknown;
}

interface SymbolSearchDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    icon?: React.ComponentType<{ className?: string }>;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    renderOption?: (option: Option) => React.ReactNode;
}

// Enhanced Symbol Search Component - Direct typing support
export const SymbolSearchDropdown = ({
    value,
    onChange,
    options,
    placeholder,
    icon,
    isOpen,
    setIsOpen,
    renderOption
}: SymbolSearchDropdownProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [filteredOptions, setFilteredOptions] = useState(options);

    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsOpen]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = options.filter((option: Option) =>
                option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (option.name && option.name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options);
        }
    }, [searchTerm, options]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toUpperCase();
        setSearchTerm(newValue);
        onChange(newValue);
        if (!isOpen && newValue.length > 0) {
            setIsOpen(true);
        }
    };

    const handleOptionSelect = (optionValue: string) => {
        setSearchTerm(optionValue);
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault();
            handleOptionSelect(filteredOptions[0].value);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    {icon && React.createElement(icon, {
                        className: "w-5 h-5 text-[#6B7280]"
                    })}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full h-14 pl-12 pr-12 bg-[#1B1B1D] 
                     border border-white/20 hover:border-[#FCD535]/50 rounded-xl text-white 
                     focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/20 
                     transition-colors duration-200 font-medium placeholder-[#6B7280]
                     backdrop-blur-xl focus:outline-none"
                />
                <div
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} cursor-pointer`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown className="w-5 h-5 text-[#6B7280] hover:text-[#FCD535] transition-colors duration-200" />
                </div>
            </div>

            {isOpen && searchTerm.length > 0 && (
                <div className="absolute z-[9999] w-full mt-3 bg-[#1B1B1D] 
                     border border-[#FCD535]/30 rounded-xl shadow-xl 
                     overflow-hidden backdrop-blur-xl"
                    style={{ zIndex: 9999 }}
                >
                    {/* Search Results Header */}
                    <div className="px-4 py-2 border-b border-[#2B2F36] bg-[#FCD535]/5">
                        <p className="text-xs text-[#6B7280]">
                            {filteredOptions.length} results for "{searchTerm}"
                        </p>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#FCD535]/20 scrollbar-track-transparent">
                        {filteredOptions.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-[#FCD535]/10 flex items-center space-x-3 group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FCD535]/10 text-[#FCD535] group-hover:bg-[#FCD535] group-hover:text-white transition-all">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">"{searchTerm}" verwenden</p>
                                    <p className="text-xs text-[#7F8C8D] group-hover:text-[#6B7280]">Als benutzerdefiniertes Symbol</p>
                                </div>
                            </button>
                        ) : (
                            filteredOptions.slice(0, 10).map((option: Option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleOptionSelect(option.value);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                             hover:bg-[#FCD535]/10 flex items-center justify-between group
                             ${value === option.value ?
                                            'bg-[#FCD535]/20 text-white' :
                                            'text-[#6B7280] hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        {renderOption ? renderOption(option) : option.label}
                                    </div>
                                    {value === option.value && (
                                        <div className="text-[#FCD535]">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
};

interface Modern3DDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    icon?: React.ComponentType<{ className?: string }>;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    renderOption?: (option: Option) => React.ReactNode;
}

// Clean Dropdown Component with better focus handling
export const Modern3DDropdown = ({
    value,
    onChange,
    options,
    placeholder,
    icon,
    isOpen,
    setIsOpen,
    renderOption
}: Modern3DDropdownProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsOpen]);

    const selectedOption = options.find((opt: Option) => opt.value === value);

    const handleOptionSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        // Prevent event propagation to avoid focus issues
        setTimeout(() => {
            if (dropdownRef.current) {
                dropdownRef.current.focus();
            }
        }, 0);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className="w-full h-14 px-5 bg-[#1B1B1D] 
                   border border-white/20 hover:border-[#FCD535]/50 rounded-xl text-white 
                   focus:outline-none focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/20 
                   transition-colors duration-200 flex items-center justify-between group
                   backdrop-blur-xl"
            >
                <div className="flex items-center space-x-3">
                    {icon && React.createElement(icon, {
                        className: "w-5 h-5 text-[#6B7280] group-hover:text-[#FCD535] transition-colors duration-300"
                    })}
                    <span className={`font-medium ${selectedOption ? 'text-white' : 'text-[#6B7280]'}`}>
                        {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.label) : placeholder}
                    </span>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-[#6B7280] group-hover:text-[#FCD535] transition-colors duration-200" />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-3 bg-[#1B1B1D] 
                     border border-[#FCD535]/30 rounded-xl shadow-xl 
                     overflow-hidden backdrop-blur-xl"
                    style={{ zIndex: 9999 }}
                >
                    <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#FCD535]/20 scrollbar-track-transparent">
                        {options.map((option: Option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOptionSelect(option.value);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                           hover:bg-[#FCD535]/10 flex items-center justify-between group
                           ${value === option.value ?
                                        'bg-[#FCD535]/20 text-white' :
                                        'text-[#6B7280] hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {renderOption ? renderOption(option) : option.label}
                                </div>
                                {value === option.value && (
                                    <div className="text-[#FCD535]">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    placeholder?: string;
    error?: string;
    icon?: React.ComponentType<{ className?: string }>;
}

// Clean Input Component with better focus handling
export const ModernInput = ({
    type = "text",
    placeholder,
    value,
    onChange,
    error,
    icon,
    ...props
}: ModernInputProps) => {
    return (
        <div className="relative">
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        {React.createElement(icon, {
                            className: "w-5 h-5 text-[#6B7280]"
                        })}
                    </div>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full h-14 ${icon ? 'pl-12' : 'pl-5'} pr-5 
                     bg-[#1B1B1D] border rounded-xl text-white font-medium placeholder-[#6B7280] 
                     focus:outline-none transition-colors duration-200
                     backdrop-blur-xl
                     ${error ?
                            'border-[#F43F5E] focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20' :
                            'border-white/20 hover:border-[#FCD535]/50 focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/20'
                        }`}
                    {...props}
                />
            </div>
            {error && <p className="text-[#F43F5E] text-sm mt-2 font-medium">{error}</p>}
        </div>
    );
};

interface ModernDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

// Modern Date Input with Calendar Picker
export const ModernDateInput = ({
    value,
    onChange,
    error,
    ...props
}: ModernDateInputProps) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(value || '');
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedDate(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        onChange(date);
        setShowCalendar(false);
    };

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const generateCalendarDays = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;

            days.push({
                date: currentDate.getDate(),
                dateStr,
                isCurrentMonth,
                isToday,
                isSelected
            });
        }

        return days;
    };

    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return (
        <div className="relative" ref={calendarRef}>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <Calendar className="w-5 h-5 text-[#6B7280] group-focus-within:text-[#FCD535] transition-colors duration-200" />
                </div>
                <input
                    type="text"
                    value={formatDisplayDate(selectedDate)}
                    onClick={() => setShowCalendar(!showCalendar)}
                    placeholder="tt.mm.jjjj"
                    readOnly
                    className={`w-full h-14 pl-12 pr-5 cursor-pointer
                     bg-[#1B1B1D] border rounded-xl text-white font-medium
                     focus:outline-none transition-all duration-200
                     backdrop-blur-xl placeholder-[#7F8C8D]
                     shadow-lg hover:shadow-xl
                     ${error ?
                            'border-[#F43F5E] focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20' :
                            'border-white/20 hover:border-[#FCD535]/50 focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/20'
                        }`}
                    {...props}
                />
            </div>

            {showCalendar && (
                <div className="absolute z-[9999] mt-2 bg-[#2A2F42] border border-[#FCD535]/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    {/* Calendar Header */}
                    <div className="bg-[#FCD535] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold">
                                {monthNames[new Date().getMonth()]} {new Date().getFullYear()}
                            </h3>
                            <div className="text-white text-sm">Datum wählen</div>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4">
                        {/* Week Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className="h-8 flex items-center justify-center text-[#7F8C8D] text-sm font-medium">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {generateCalendarDays().map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleDateSelect(day.dateStr)}
                                    className={`h-8 w-8 flex items-center justify-center text-sm rounded-lg transition-all duration-200 ${day.isSelected
                                        ? 'bg-[#FCD535] text-white font-bold shadow-lg'
                                        : day.isToday
                                            ? 'bg-[#FCD535]/20 text-[#FCD535] font-semibold border border-[#FCD535]/50'
                                            : day.isCurrentMonth
                                                ? 'text-white hover:bg-[#FCD535]/10 hover:text-[#FCD535]'
                                                : 'text-[#7F8C8D] hover:bg-white/5'
                                        }`}
                                >
                                    {day.date}
                                </button>
                            ))}
                        </div>

                        {/* Today Button */}
                        <div className="mt-4 pt-3 border-t border-[#2B2F36]">
                            <button
                                type="button"
                                onClick={() => handleDateSelect(new Date().toISOString().split('T')[0])}
                                className="w-full px-3 py-2 bg-[#FCD535]/10 hover:bg-[#FCD535]/20 text-[#FCD535] rounded-lg text-sm font-medium transition-all duration-200"
                            >
                                Heute
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="text-[#F43F5E] text-sm mt-2 font-medium">{error}</p>}
        </div>
    );
};







