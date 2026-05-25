'use client';

import { useEffect, useState } from 'react';

export default function ClientDate({ date, className, style, onlyHour = false }: { date: string, className?: string, style?: React.CSSProperties, onlyHour?: boolean }) {
    const [mounted, setMounted] = useState(false);
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const d = new Date(date);
    const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const finalFormattedDate = onlyHour ? timeString.split(' ')[0] : timeString;

    if (!mounted) {
        return <span className={className} style={style}>--:--</span>;
    }

    return (
        <span className={className} style={style} suppressHydrationWarning>
            {finalFormattedDate}
        </span>
    );
}
