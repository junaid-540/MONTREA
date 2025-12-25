import ExcelJS from 'exceljs';

export const generateSalesReportExcel = async (reportData, stream) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.properties.defaultRowHeight = 20;

        // Define columns
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Payment', key: 'payment', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Items', key: 'items', width: 10 },
            { header: 'Discount', key: 'discount', width: 12 },
            { header: 'Coupon', key: 'coupon', width: 12 },
            { header: 'Amount', key: 'amount', width: 15 }
        ];

        // Title
        worksheet.mergeCells('A1:I1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'MONTRÉA - SALES REPORT';
        titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF000000' }
        };

        // Date Range
        let dateRangeText = '';
        if (reportData.filterType === 'day') {
            dateRangeText = `Today (${new Date().toLocaleDateString('en-IN')})`;
        } else if (reportData.filterType === 'week') {
            dateRangeText = 'This Week';
        } else if (reportData.filterType === 'month') {
            dateRangeText = 'This Month';
        } else if (reportData.filterType === 'custom' && reportData.startDate && reportData.endDate) {
            dateRangeText = `${new Date(reportData.startDate).toLocaleDateString('en-IN')} - ${new Date(reportData.endDate).toLocaleDateString('en-IN')}`;
        } else {
            dateRangeText = 'All Time';
        }

        worksheet.mergeCells('A2:I2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Period: ${dateRangeText} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
        dateCell.alignment = { horizontal: 'center' };
        dateCell.font = { italic: true, size: 11 };

        // Summary Section
        worksheet.addRow([]);
        const summaryRow = worksheet.addRow(['SUMMARY']);
        summaryRow.font = { bold: true, size: 14 };
        summaryRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        worksheet.addRow(['Total Orders:', reportData.totalOrders]);
        worksheet.addRow(['Total Sales:', `₹${reportData.totalSales}`]);
        worksheet.addRow(['Total Discount:', `₹${reportData.totalDiscount}`]);
        worksheet.addRow(['Coupon Discount:', `₹${reportData.totalCouponDiscount}`]);
        worksheet.addRow(['Average Order:', `₹${reportData.totalOrders > 0 ? Math.round(reportData.totalSales / reportData.totalOrders) : 0}`]);

        // Style summary cells
        for (let i = 5; i <= 9; i++) {
            worksheet.getRow(i).getCell(1).font = { bold: true };
            worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };
        }

        // Financial Breakdown Section
        worksheet.addRow([]);
        const financialRow = worksheet.addRow(['FINANCIAL BREAKDOWN']);
        financialRow.font = { bold: true, size: 14 };
        financialRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        worksheet.addRow(['Product Subtotal:', `₹${reportData.totalSubtotal}`]);
        // worksheet.addRow(['Product Discounts:', `-₹${reportData.totalDiscount}`]);
        worksheet.addRow(['Coupon Discounts:', `-₹${reportData.totalCouponDiscount}`]);
        worksheet.addRow(['Shipping Charges:', `+₹${reportData.totalShipping}`]);
        worksheet.addRow(['Tax (GST 18%):', `+₹${reportData.totalTax}`]);
        worksheet.addRow(['Net Revenue:', `₹${reportData.totalSales}`]);

        // Style financial cells
        const financialStartRow = worksheet.lastRow.number - 6;
        for (let i = financialStartRow; i <= worksheet.lastRow.number - 1; i++) {
            worksheet.getRow(i).getCell(1).font = { bold: true };
            worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FF059669' } };
        }
        
        // Style formula row
        worksheet.getRow(worksheet.lastRow.number).getCell(1).font = { italic: true, size: 10 };
        worksheet.getRow(worksheet.lastRow.number).getCell(2).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

        // Payment Method Breakdown Section
        worksheet.addRow([]);
        const paymentRow = worksheet.addRow(['PAYMENT METHOD BREAKDOWN']);
        paymentRow.font = { bold: true, size: 14 };
        paymentRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        // Add payment method details
        Object.entries(reportData.paymentBreakdown).forEach(([method, data]) => {
            const percentage = reportData.totalOrders > 0 
                ? ((data.count / reportData.totalOrders) * 100).toFixed(1) 
                : 0;
            
            worksheet.addRow([
                `${method}:`,
                `${data.count} order  | ₹${Math.round(data.amount)}`
            ]);
            
            const lastRow = worksheet.lastRow;
            lastRow.getCell(1).font = { bold: true };
            lastRow.getCell(2).font = { bold: true, color: { argb: 'FF8B5CF6' } };
        });

        // Empty row
        worksheet.addRow([]);

        // Table Headers
        const headerRow = worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Payment',
            'Status',
            'Items Sold',
            'Discount',
            'Coupon',
            'Amount'
        ]);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Data Rows
        reportData.orders.forEach((order, index) => {
            // Calculate values
            const cancelledItemsTotal = order.items
                .filter(item => item.itemStatus === 'Cancelled')
                .reduce((sum, item) => sum + item.itemTotal, 0);
            
            const actualAmount = order.totalAmount - cancelledItemsTotal;
            
            const validItems = order.items.filter(item => item.itemStatus !== 'Cancelled');
            const itemsSold = validItems.reduce((sum, item) => sum + item.quantity, 0);

            const row = worksheet.addRow({
                orderId: order.orderId,
                date: new Date(order.placedAt).toLocaleDateString('en-IN'),
                customer: order.userId?.name || 'N/A',
                payment: order.paymentMethod,
                status: order.orderStatus,
                items: itemsSold,
                discount: `₹${order.discount || 0}`,
                coupon: `₹${order.discountAmount || 0}`,
                amount: `₹${Math.round(actualAmount)}`
            });

            // Alternate row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9FAFB' }
                };
            }

            row.alignment = { vertical: 'middle' };
            row.height = 20;

            // Color code status
            const statusCell = row.getCell('status');
            if (order.orderStatus === 'Delivered') {
                statusCell.font = { color: { argb: 'FF10B981' }, bold: true };
            } else if (order.orderStatus === 'Cancelled') {
                statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
            } else if (order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery') {
                statusCell.font = { color: { argb: 'FF3B82F6' }, bold: true };
            } else {
                statusCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
            }
        });

        // Add borders to all data cells
        const dataStartRow = worksheet.lastRow.number - reportData.orders.length;
        for (let i = dataStartRow; i <= worksheet.lastRow.number; i++) {
            for (let j = 1; j <= 9; j++) {
                worksheet.getRow(i).getCell(j).border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            }
        }

        // Add footer
        worksheet.addRow([]);
        const footerRow = worksheet.addRow([`Generated on ${new Date().toLocaleString('en-IN')} | MONTRÉA © 2025`]);
        footerRow.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
        worksheet.mergeCells(`A${footerRow.number}:I${footerRow.number}`);
        footerRow.alignment = { horizontal: 'center' };

        // Freeze header row
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: dataStartRow }];

        // Write to stream
        await workbook.xlsx.write(stream);
        stream.end();

    } catch (error) {
        throw error;
    }
};