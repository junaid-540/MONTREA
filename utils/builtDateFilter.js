export const buildDateFilter = (filterType, startDate, endDate) => {
    let dateFilter = {};
    const now = new Date();

    if (filterType === 'day') {
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));
        dateFilter = { placedAt: { $gte: todayStart, $lte: todayEnd } };
    } else if (filterType === 'week') {
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date();
        weekEnd.setHours(23, 59, 59, 999);
        dateFilter = { placedAt: { $gte: weekStart, $lte: weekEnd } };
    } else if (filterType === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateFilter = { placedAt: { $gte: monthStart, $lte: monthEnd } };
    } else if (filterType === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter = { placedAt: { $gte: start, $lte: end } };
    }

    return dateFilter;
};