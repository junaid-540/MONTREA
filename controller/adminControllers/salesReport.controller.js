import Order from "../../models/orderSchema.js";
import { generateSalesReportPDF } from "../../utils/generateSalesReport.js";
import { generateSalesReportExcel } from "../../utils/generateSalesExcel.js";
import { buildDateFilter } from "../../utils/builtDateFilter.js";
import { calculateMetrics } from "../../utils/calculateMetrics.js";


export const getSalesReportPage = async (req, res, next) => {
    try {
        const { filterType = 'all', startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(filterType, startDate, endDate);

        // Fetching orders excluded the pending and failed payments
        const orders = await Order.find({
            ...dateFilter,
            $or: [
                { paymentMethod: 'COD' },
                { paymentMethod: 'Wallet' },
                { paymentMethod: 'Razorpay', paymentStatus: 'Paid' }
            ],
            orderStatus: { $nin: ['Pending'] }
        }).populate('userId', 'name email').sort({ placedAt: -1 }).lean();

        // Calculate all metrics
        const metrics = calculateMetrics(orders);

        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('admin/sales-report', {
            Title: 'Sales Report',
            orders,
            ...metrics,
            filterType,
            startDate: startDate || '',
            endDate: endDate || '',
            messages,
            pageCSS: '/public/css/admin/sales-report.css',
            pageJS: '/public/js/admin/sales-report.js',
            activePage: 'sales-report'
        });

    } catch (err) {
        console.error('Error in getSalesReportPage:', err);
        next(err);
    }
};

export const downloadSalesReportPDF = async (req, res, next) => {
    try {
        const { filterType = 'all', startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(filterType, startDate, endDate);

        const orders = await Order.find({
            ...dateFilter,
            $or: [
                { paymentMethod: 'COD' },
                { paymentMethod: 'Wallet' },
                { paymentMethod: 'Razorpay', paymentStatus: 'Paid' }
            ],
            orderStatus: { $nin: ['Pending'] }
        }).populate('userId', 'name email').sort({ placedAt: -1 }).lean();

        const metrics = calculateMetrics(orders);

        const reportData = {
            orders,
            ...metrics,
            filterType,
            startDate,
            endDate
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);

        await generateSalesReportPDF(reportData, res);

    } catch (err) {
        console.error('Error in downloadSalesReportPDF:', err);
        if (!res.headersSent) {
            next(err);
        }
    }
};

export const downloadSalesReportExcel = async (req, res, next) => {
    try {
        const { filterType = 'all', startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(filterType, startDate, endDate);

        const orders = await Order.find({
            ...dateFilter,
            $or: [
                { paymentMethod: 'COD' },
                { paymentMethod: 'Wallet' },
                { paymentMethod: 'Razorpay', paymentStatus: 'Paid' }
            ],
            orderStatus: { $nin: ['Pending'] }
        }).populate('userId', 'name email').sort({ placedAt: -1 }).lean();

        const metrics = calculateMetrics(orders);

        const reportData = {
            orders,
            ...metrics,
            filterType,
            startDate,
            endDate
        };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);

        await generateSalesReportExcel(reportData, res);

    } catch (err) {
        console.error('Error in downloadSalesReportExcel:', err);
        if (!res.headersSent) {
            next(err);
        }
    }
};