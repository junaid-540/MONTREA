import ExcelJS from 'exceljs';

export const generateSalesReportExcel = async (reportData, stream) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.properties.defaultRowHeight = 20;

        // Define columns for per-item breakdown
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 18 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Product Name', key: 'productName', width: 25 },
            { header: 'Variant', key: 'variant', width: 12 },
            { header: 'Qty', key: 'quantity', width: 6 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Discount', key: 'discount', width: 10 },
            { header: 'Coupon', key: 'coupon', width: 10 },
            { header: 'Item Status', key: 'itemStatus', width: 15 },
            { header: 'Order Status', key: 'orderStatus', width: 15 },
            { header: 'Payment', key: 'payment', width: 12 },
            { header: 'Item Total', key: 'itemTotal', width: 12 }
        ];

        // Title
        worksheet.mergeCells('A1:M1');
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

        worksheet.mergeCells('A2:M2');
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
        worksheet.addRow(['Total Items:', reportData.totalItemsSold]);
        worksheet.addRow(['Total Sales:', `₹${reportData.totalSales}`]);
        worksheet.addRow(['Total Discount:', `₹${reportData.totalDiscount}`]);
        worksheet.addRow(['Coupon Discount:', `₹${reportData.totalCouponDiscount}`]);
        worksheet.addRow(['Average Order:', `₹${reportData.totalOrders > 0 ? Math.round(reportData.totalSales / reportData.totalOrders) : 0}`]);
        
        // Returns and refunds
        worksheet.addRow(['Total Returns:', reportData.totalReturns]);
        worksheet.addRow(['Return Amount:', `₹${reportData.totalReturnAmount}`]);
        worksheet.addRow(['Total Cancellations:', reportData.totalCancellations]);
        worksheet.addRow(['Cancellation Amount:', `₹${reportData.totalCancellationAmount}`]);
        worksheet.addRow(['Total Refunds:', `₹${reportData.totalRefunds}`]);

        // Style summary cells
        for (let i = 5; i <= 15; i++) {
            worksheet.getRow(i).getCell(1).font = { bold: true };
            if (i <= 10) {
                worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };
            } else {
                worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FFEF4444' } };
            }
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
        worksheet.addRow(['Coupon Discounts:', `-₹${reportData.totalCouponDiscount}`]);
        worksheet.addRow(['Shipping Charges:', `+₹${reportData.totalShipping}`]);
        worksheet.addRow(['Tax (GST 18%):', `+₹${reportData.totalTax}`]);
        worksheet.addRow(['Net Revenue:', `₹${reportData.totalSales}`]);

        const financialStartRow = worksheet.lastRow.number - 5;
        for (let i = financialStartRow; i <= worksheet.lastRow.number - 1; i++) {
            worksheet.getRow(i).getCell(1).font = { bold: true };
            worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FF059669' } };
        }

        // Returns & Cancellations Breakdown Section
        worksheet.addRow([]);
        const refundRow = worksheet.addRow(['RETURNS & CANCELLATIONS']);
        refundRow.font = { bold: true, size: 14 };
        refundRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        worksheet.addRow(['Cancelled Items:', reportData.totalCancellations]);
        worksheet.addRow(['Cancellation Refunds:', `-₹${reportData.totalCancellationAmount}`]);
        worksheet.addRow(['Returned Items:', reportData.totalReturns]);
        worksheet.addRow(['Return Refunds:', `-₹${reportData.totalReturnAmount}`]);
        worksheet.addRow(['Total Refunds:', `-₹${reportData.totalRefunds}`]);

        const refundStartRow = worksheet.lastRow.number - 5;
        for (let i = refundStartRow; i <= worksheet.lastRow.number; i++) {
            worksheet.getRow(i).getCell(1).font = { bold: true };
            worksheet.getRow(i).getCell(2).font = { bold: true, color: { argb: 'FFEF4444' } };
        }

        // Payment Method Breakdown Section
        worksheet.addRow([]);
        const paymentRow = worksheet.addRow(['PAYMENT METHOD BREAKDOWN']);
        paymentRow.font = { bold: true, size: 14 };
        paymentRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        Object.entries(reportData.paymentBreakdown).forEach(([method, data]) => {
            const percentage = reportData.totalOrders > 0 
                ? ((data.count / reportData.totalOrders) * 100).toFixed(1) 
                : 0;
            
            worksheet.addRow([
                `${method}:`,
                `${data.count} orders (${percentage}%) | ₹${Math.round(data.amount)}`
            ]);
            
            const lastRow = worksheet.lastRow;
            lastRow.getCell(1).font = { bold: true };
            lastRow.getCell(2).font = { bold: true, color: { argb: 'FF8B5CF6' } };
        });

        // Order Status Breakdown Section
        worksheet.addRow([]);
        const statusRow = worksheet.addRow(['ORDER STATUS BREAKDOWN']);
        statusRow.font = { bold: true, size: 14 };
        statusRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        Object.entries(reportData.statusBreakdown).forEach(([status, count]) => {
            const percentage = reportData.totalOrders > 0 
                ? ((count / reportData.totalOrders) * 100).toFixed(1) 
                : 0;
            
            worksheet.addRow([
                `${status}:`,
                `${count} orders (${percentage}%)`
            ]);
            
            const lastRow = worksheet.lastRow;
            lastRow.getCell(1).font = { bold: true };
            lastRow.getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };
        });

        // Empty row
        worksheet.addRow([]);
        
        // Section title for item breakdown
        const itemBreakdownRow = worksheet.addRow(['COMPLETE ORDER ITEMS BREAKDOWN']);
        itemBreakdownRow.font = { bold: true, size: 14 };
        itemBreakdownRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };
        
        const subtitleRow = worksheet.addRow(['(Includes all items: Delivered, Cancelled, and Returned)']);
        subtitleRow.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
        
        worksheet.addRow([]);

        // Table Headers
        const headerRow = worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Product Name',
            'Variant',
            'Qty',
            'Price',
            'Discount',
            'Coupon',
            'Item Status',
            'Order Status',
            'Payment',
            'Item Total'
        ]);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Data Rows - PER ITEM
        let totalRevenue = 0;
        let totalLoss = 0;
        let itemCount = 0;

        reportData.orders.forEach((order) => {
            // Calculate coupon per item (distribute proportionally)
            const orderTotal = order.items.reduce((sum, item) => {
                const itemPrice = item.discountedPriceAtPurchase > 0 ? item.discountedPriceAtPurchase : item.priceAtPurchase;
                return sum + (itemPrice * item.quantity);
            }, 0);

            order.items.forEach((item, itemIndex) => {
                const isCancelled = item.itemStatus === 'Cancelled';
                const isReturned = item.itemStatus === 'Returned';
                const isLoss = isCancelled || isReturned;

                const itemPrice = item.discountedPriceAtPurchase > 0 ? item.discountedPriceAtPurchase : item.priceAtPurchase;
                const productDiscount = item.priceAtPurchase - itemPrice;
                const itemSubtotal = itemPrice * item.quantity;
                
                // Calculate proportional coupon discount for this item
                let itemCouponDiscount = 0;
                if (order.discountAmount > 0 && orderTotal > 0) {
                    itemCouponDiscount = Math.round((itemSubtotal / orderTotal) * order.discountAmount);
                }

                // Item total is just the discounted price × quantity (NOT minus coupon)
                const itemTotal = itemSubtotal;

                // Track revenue and loss
                if (isLoss) {
                    totalLoss += itemTotal;
                } else {
                    totalRevenue += itemTotal;
                }

                const row = worksheet.addRow({
                    orderId: itemIndex === 0 ? order.orderId : '', // Show order ID only for first item
                    date: itemIndex === 0 ? new Date(order.placedAt).toLocaleDateString('en-IN') : '',
                    customer: itemIndex === 0 ? (order.userId?.name || 'N/A') : '',
                    productName: item.name,
                    variant: `${item.color}/${item.size}`,
                    quantity: item.quantity,
                    price: `₹${itemPrice}`,
                    discount: productDiscount > 0 ? `-₹${productDiscount}` : '-',
                    coupon: itemCouponDiscount > 0 ? `-₹${itemCouponDiscount}` : '-',
                    itemStatus: item.itemStatus,
                    orderStatus: itemIndex === 0 ? order.orderStatus : '',
                    payment: itemIndex === 0 ? order.paymentMethod : '',
                    itemTotal: isLoss ? `-₹${Math.round(itemTotal)}` : `₹${Math.round(itemTotal)}`
                });

                // Background color based on status
                let bgColor;
                if (isCancelled) {
                    bgColor = 'FFFEE2E2'; // Light red
                } else if (isReturned) {
                    bgColor = 'FFFEF3C7'; // Light yellow
                } else if (item.itemStatus === 'Delivered') {
                    bgColor = 'FFD1FAE5'; // Light green
                } else {
                    bgColor = itemCount % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
                }

                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bgColor }
                };

                row.alignment = { vertical: 'middle' };
                row.height = 20;

                // Color code item status
                const itemStatusCell = row.getCell('itemStatus');
                if (item.itemStatus === 'Delivered') {
                    itemStatusCell.font = { color: { argb: 'FF10B981' }, bold: true };
                } else if (item.itemStatus === 'Cancelled') {
                    itemStatusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else if (item.itemStatus === 'Returned') {
                    itemStatusCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
                } else if (item.itemStatus === 'Shipped' || item.itemStatus === 'Out for Delivery') {
                    itemStatusCell.font = { color: { argb: 'FF3B82F6' }, bold: true };
                } else {
                    itemStatusCell.font = { color: { argb: 'FF6B7280' }, bold: true };
                }

                // Color code order status (only for first item)
                if (itemIndex === 0) {
                    const orderStatusCell = row.getCell('orderStatus');
                    if (order.orderStatus === 'Delivered') {
                        orderStatusCell.font = { color: { argb: 'FF10B981' }, bold: true };
                    } else if (order.orderStatus === 'Cancelled') {
                        orderStatusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                    } else if (order.orderStatus.includes('Partially')) {
                        orderStatusCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
                    } else {
                        orderStatusCell.font = { color: { argb: 'FF3B82F6' }, bold: true };
                    }
                }

                // Color code item total
                const itemTotalCell = row.getCell('itemTotal');
                if (isLoss) {
                    itemTotalCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else {
                    itemTotalCell.font = { color: { argb: 'FF10B981' }, bold: true };
                }

                itemCount++;
            });
        });

        // Add borders to all data cells
        const dataStartRow = worksheet.lastRow.number - itemCount + 1;
        for (let i = dataStartRow; i <= worksheet.lastRow.number; i++) {
            for (let j = 1; j <= 13; j++) {
                worksheet.getRow(i).getCell(j).border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            }
        }

        // Add summary at the end
        worksheet.addRow([]);
        const summaryEndRow = worksheet.addRow(['ITEMS SUMMARY']);
        summaryEndRow.font = { bold: true, size: 12 };
        summaryEndRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        const totalItemsRow = worksheet.addRow(['Total Items:', itemCount]);
        totalItemsRow.getCell(1).font = { bold: true };
        totalItemsRow.getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };

        const revenueRow = worksheet.addRow(['Revenue from Delivered Items:', `₹${Math.round(totalRevenue)}`]);
        revenueRow.getCell(1).font = { bold: true };
        revenueRow.getCell(2).font = { bold: true, color: { argb: 'FF10B981' } };

        const lossRow = worksheet.addRow(['Loss from Cancelled/Returned:', `₹${Math.round(totalLoss)}`]);
        lossRow.getCell(1).font = { bold: true };
        lossRow.getCell(2).font = { bold: true, color: { argb: 'FFEF4444' } };

        // Add footer
        worksheet.addRow([]);
        const footerRow = worksheet.addRow([`Generated on ${new Date().toLocaleString('en-IN')} | MONTRÉA © 2025`]);
        footerRow.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
        worksheet.mergeCells(`A${footerRow.number}:M${footerRow.number}`);
        footerRow.alignment = { horizontal: 'center' };

        // Freeze header row
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: dataStartRow - 1 }];

        // Write to stream
        await workbook.xlsx.write(stream);
        stream.end();

    } catch (error) {
        throw error;
    }
};