import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Calendar, Plus } from "lucide-react";

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
}: any) => {
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
            const filtered = options.filter((option: any) =>
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
                        className: "w-5 h-5 text-[#BDC3C7]"
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
                    className="w-full h-14 pl-12 pr-12 bg-[#1E2232] 
                     border border-white/20 hover:border-[#6A3DF4]/50 rounded-xl text-white 
                     focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 
                     transition-colors duration-200 font-medium placeholder-[#BDC3C7]
                     backdrop-blur-xl focus:outline-none"
                />
                <div
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} cursor-pointer`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown className="w-5 h-5 text-[#BDC3C7] hover:text-[#6A3DF4] transition-colors duration-200" />
                </div>
            </div>

            {isOpen && searchTerm.length > 0 && (
                <div className="absolute z-[9999] w-full mt-3 bg-[#1E2232] 
                     border border-[#6A3DF4]/30 rounded-xl shadow-xl 
                     overflow-hidden backdrop-blur-xl"
                    style={{ zIndex: 9999 }}
                >
                    {/* Search Results Header */}
                    <div className="px-4 py-2 border-b border-white/10 bg-[#6A3DF4]/5">
                        <p className="text-xs text-[#BDC3C7]">
                            {filteredOptions.length} results for "{searchTerm}"
                        </p>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#6A3DF4]/20 scrollbar-track-transparent">
                        {filteredOptions.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-[#6A3DF4]/10 flex items-center space-x-3 group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#6A3DF4]/10 text-[#6A3DF4] group-hover:bg-[#6A3DF4] group-hover:text-white transition-all">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">"{searchTerm}" verwenden</p>
                                    <p className="text-xs text-[#7F8C8D] group-hover:text-[#BDC3C7]">Als benutzerdefiniertes Symbol</p>
                                </div>
                            </button>
                        ) : (
                            filteredOptions.slice(0, 10).map((option: any) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleOptionSelect(option.value);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                             hover:bg-[#6A3DF4]/10 flex items-center justify-between group
                             ${value === option.value ?
                                            'bg-[#6A3DF4]/20 text-white' :
                                            'text-[#BDC3C7] hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        {renderOption ? renderOption(option) : option.label}
                                    </div>
                                    {value === option.value && (
                                        <div className="text-[#6A3DF4]">
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
}: any) => {
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

    const selectedOption = options.find((opt: any) => opt.value === value);

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
                className="w-full h-14 px-5 bg-[#1E2232] 
                   border border-white/20 hover:border-[#6A3DF4]/50 rounded-xl text-white 
                   focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 
                   transition-colors duration-200 flex items-center justify-between group
                   backdrop-blur-xl"
            >
                <div className="flex items-center space-x-3">
                    {icon && React.createElement(icon, {
                        className: "w-5 h-5 text-[#BDC3C7] group-hover:text-[#6A3DF4] transition-colors duration-300"
                    })}
                    <span className={`font-medium ${selectedOption ? 'text-white' : 'text-[#BDC3C7]'}`}>
                        {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.label) : placeholder}
                    </span>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-[#BDC3C7] group-hover:text-[#6A3DF4] transition-colors duration-200" />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-3 bg-[#1E2232] 
                     border border-[#6A3DF4]/30 rounded-xl shadow-xl 
                     overflow-hidden backdrop-blur-xl"
                    style={{ zIndex: 9999 }}
                >
                    <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#6A3DF4]/20 scrollbar-track-transparent">
                        {options.map((option: any) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOptionSelect(option.value);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                           hover:bg-[#6A3DF4]/10 flex items-center justify-between group
                           ${value === option.value ?
                                        'bg-[#6A3DF4]/20 text-white' :
                                        'text-[#BDC3C7] hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {renderOption ? renderOption(option) : option.label}
                                </div>
                                {value === option.value && (
                                    <div className="text-[#6A3DF4]">
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

// Clean Input Component with better focus handling
export const ModernInput = ({
    type = "text",
    placeholder,
    value,
    onChange,
    error,
    icon,
    ...props
}: any) => {
    return (
        <div className="relative">
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        {React.createElement(icon, {
                            className: "w-5 h-5 text-[#BDC3C7]"
                        })}
                    </div>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full h-14 ${icon ? 'pl-12' : 'pl-5'} pr-5 
                     bg-[#1E2232] border rounded-xl text-white font-medium placeholder-[#BDC3C7] 
                     focus:outline-none transition-colors duration-200
                     backdrop-blur-xl
                     ${error ?
                            'border-[#E74C3C] focus:border-[#E74C3C] focus:ring-2 focus:ring-[#E74C3C]/20' :
                            'border-white/20 hover:border-[#6A3DF4]/50 focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20'
                        }`}
                    {...props}
                />
            </div>
            {error && <p className="text-[#E74C3C] text-sm mt-2 font-medium">{error}</p>}
        </div>
    );
};

// Modern Date Input with Calendar Picker
export const ModernDateInput = ({
    value,
    onChange,
    error,
    placeholder,
    ...props
}: any) => {
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
                    <Calendar className="w-5 h-5 text-[#BDC3C7] group-focus-within:text-[#6A3DF4] transition-colors duration-200" />
                </div>
                <input
                    type="text"
                    value={formatDisplayDate(selectedDate)}
                    onClick={() => setShowCalendar(!showCalendar)}
                    placeholder="tt.mm.jjjj"
                    readOnly
                    className={`w-full h-14 pl-12 pr-5 cursor-pointer
                     bg-[#1E2232] border rounded-xl text-white font-medium
                     focus:outline-none transition-all duration-200
                     backdrop-blur-xl placeholder-[#7F8C8D]
                     shadow-lg hover:shadow-xl
                     ${error ?
                            'border-[#E74C3C] focus:border-[#E74C3C] focus:ring-2 focus:ring-[#E74C3C]/20' :
                            'border-white/20 hover:border-[#6A3DF4]/50 focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20'
                        }`}
                    {...props}
                />
            </div>

            {showCalendar && (
                <div className="absolute z-[9999] mt-2 bg-[#2A2F42] border border-[#6A3DF4]/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    {/* Calendar Header */}
                    <div className="bg-[#6A3DF4] px-4 py-3">
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
                                        ? 'bg-[#6A3DF4] text-white font-bold shadow-lg'
                                        : day.isToday
                                            ? 'bg-[#6A3DF4]/20 text-[#6A3DF4] font-semibold border border-[#6A3DF4]/50'
                                            : day.isCurrentMonth
                                                ? 'text-white hover:bg-[#6A3DF4]/10 hover:text-[#6A3DF4]'
                                                : 'text-[#7F8C8D] hover:bg-white/5'
                                        }`}
                                >
                                    {day.date}
                                </button>
                            ))}
                        </div>

                        {/* Today Button */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => handleDateSelect(new Date().toISOString().split('T')[0])}
                                className="w-full px-3 py-2 bg-[#6A3DF4]/10 hover:bg-[#6A3DF4]/20 text-[#6A3DF4] rounded-lg text-sm font-medium transition-all duration-200"
                            >
                                Heute
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="text-[#E74C3C] text-sm mt-2 font-medium">{error}</p>}
        </div>
    );
};
