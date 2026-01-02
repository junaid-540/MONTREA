export const buildDateFilter = (filterType, startDate, endDate) => {
    let dateFilter = {};
    const now = new Date();

    if (filterType === 'day') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        dateFilter = { placedAt: { $gte: todayStart, $lte: todayEnd } };
    } else if (filterType === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        
        dateFilter = { placedAt: { $gte: weekStart, $lte: weekEnd } };
    } else if (filterType === 'month') {
        // Last 30 days
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(now);
        monthEnd.setHours(23, 59, 59, 999);
        
        dateFilter = { placedAt: { $gte: monthStart, $lte: monthEnd } };
    } else if (filterType === 'custom' && startDate && endDate) {
        if (!startDate || !endDate) {
            throw new Error('Both start and end dates are required for custom filter');
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid date format provided');
        }
        
        if (start > end) {
            throw new Error('Start date cannot be after end date');
        }
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (start > today || end > today) {
            throw new Error('Dates cannot be in the future');
        }
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        dateFilter = { placedAt: { $gte: start, $lte: end } };
    }

    return dateFilter;
};