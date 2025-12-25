import PDFDocument from 'pdfkit';

export const generateSalesReportPDF = (reportData, stream) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4'
            });

            doc.pipe(stream);

            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('MONTRÉA', 50, 50)
               .fontSize(10)
               .font('Helvetica')
               .text('Fashion E-commerce', 50, 80)
               .text('Sales Report', 50, 95);

            // Report Title
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text('SALES REPORT', 350, 49, { align: 'right' });

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

            doc.fontSize(10)
               .font('Helvetica')
               .text(`Period: ${dateRangeText}`, 400, 80, { align: 'right' })
               .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 400, 95, { align: 'right' });

            // Line
            doc.moveTo(50, 120)
               .lineTo(550, 120)
               .stroke();

            // Summary Section
            const summaryY = 140;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Summary', 50, summaryY);

            doc.fontSize(11)
               .font('Helvetica')
               .text(`Total Orders: ${reportData.totalOrders}`, 50, summaryY + 25)
               .text(`Total Sales:  ${reportData.totalSales.toFixed(2)}`, 200, summaryY + 25)
               .text(`Items Sold: ${reportData.totalItemsSold}`, 380, summaryY + 25);

            doc.text(`Product Discount:  ${reportData.totalDiscount}`, 50, summaryY + 45)
               .text(`Coupon Discount:  ${reportData.totalCouponDiscount}`, 200, summaryY + 45)
               .text(`Avg Order:  ${reportData.totalOrders > 0 ? Math.round(reportData.totalSales / reportData.totalOrders).toFixed(2) : 0}`, 380, summaryY + 45);

            // Financial Breakdown Section
            const financialY = summaryY + 80;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Financial Breakdown', 50, financialY);

            doc.fontSize(11)
               .font('Helvetica')
               .text(`Product Subtotal:  ${reportData.totalSubtotal.toFixed(2)}`, 50, financialY + 25)
               .text(`Coupon Discounts:  ${reportData.totalCouponDiscount}`, 200, financialY + 25)
               .text(`Shipping Charges:  ${reportData.totalShipping.toFixed(2)}`, 380, financialY + 25);

            doc.text(`Tax (GST 18%):  ${reportData.totalTax}`, 50, financialY + 45)
               .text(`Net Revenue:  ${reportData.totalSales.toFixed(2)}`, 200, financialY + 45)
            //    .text(`:  ${}`, 380, financialY + 45);

            // Payment Method Breakdown Section
            const paymentY = financialY + 80;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Payment Method Breakdown', 50, paymentY);

            let paymentRowY = paymentY + 25;
            doc.fontSize(11)
               .font('Helvetica');

            Object.entries(reportData.paymentBreakdown).forEach(([method, data]) => {
                const percentage = reportData.totalOrders > 0 
                    ? ((data.count / reportData.totalOrders) * 100).toFixed(1) 
                    : 0;
                
                doc.text(`${method}:`, 50, paymentRowY)
                   .text(`${data.count} orders`, 150, paymentRowY)
                   .text(` ${Math.round(data.amount).toFixed(2)}`, 300, paymentRowY);
                
                paymentRowY += 20;
            });

            
            doc.moveTo(50, paymentRowY + 10)
               .lineTo(550, paymentRowY + 10)
               .stroke();

            // Orders Table
            const tableTop = paymentRowY + 30;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Order Details', 50, tableTop);

            const tableHeaderY = tableTop + 30;
            doc.fontSize(9)
               .font('Helvetica-Bold');

            doc.text('Order ID', 50, tableHeaderY)
               .text('Date', 140, tableHeaderY)
               .text('Customer', 210, tableHeaderY)
               .text('Payment', 300, tableHeaderY)
               .text('Status', 370, tableHeaderY)
               .text('Items', 440, tableHeaderY)
               .text('Amount', 480, tableHeaderY, { width: 70, align: 'right' });

            doc.moveTo(50, tableHeaderY + 15)
               .lineTo(550, tableHeaderY + 15)
               .stroke();

            // Table Rows
            let yPosition = tableHeaderY + 25;
            doc.font('Helvetica').fontSize(8);

            const maxOrders = 15; // Reduced to fit new sections
            reportData.orders.slice(0, maxOrders).forEach((order) => {
                // Calculate actual amount (exclude cancelled items)
                const cancelledItemsTotal = order.items
                    .filter(item => item.itemStatus === 'Cancelled')
                    .reduce((sum, item) => sum + item.itemTotal, 0);
                
                const actualAmount = order.totalAmount - cancelledItemsTotal;
                
                const validItems = order.items.filter(item => item.itemStatus !== 'Cancelled');
                const itemsSold = validItems.reduce((sum, item) => sum + item.quantity, 0);

                doc.text(order.orderId, 50, yPosition, { width: 80 })
                   .text(new Date(order.placedAt).toLocaleDateString('en-IN'), 140, yPosition, { width: 60 })
                   .text(order.userId?.name || 'N/A', 210, yPosition, { width: 80 })
                   .text(order.paymentMethod, 300, yPosition, { width: 60 })
                   .text(order.orderStatus, 370, yPosition, { width: 60 })
                   .text(itemsSold.toString(), 440, yPosition, { width: 30 })
                   .text(`${Math.round(actualAmount).toFixed(2)}`, 480, yPosition, { width: 70, align: 'right' });

                yPosition += 18;

                if (yPosition > 720) {
                    doc.addPage();
                    yPosition = 50;
                }
            });

            if (reportData.orders.length > maxOrders) {
                yPosition += 10;
                doc.fontSize(8)
                   .fillColor('#666666')
                   .text(`... and ${reportData.orders.length - maxOrders} more orders`, 50, yPosition, { align: 'center', width: 500 });
            }

            // Footer
            const footerY = 750;
            doc.fontSize(8)
               .fillColor('#666666')
               .text('MONTRÉA - Fashion E-commerce', 50, footerY, { align: 'center', width: 500 })
               .text('© 2025 All Rights Reserved', 50, footerY + 12, { align: 'center', width: 500 });

            doc.end();

            stream.on('finish', () => {
                resolve();
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};