import PDFDocument from 'pdfkit';

export const generateSalesReportPDF = (reportData, stream) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4',
                bufferPages: true
            });

            doc.pipe(stream);

            // Color scheme
            const colors = {
                primary: '#0c0d0d',
                secondary: '#a47f5f',
                success: '#10b981',
                danger: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6',
                lightGray: '#f3f4f6',
                mediumGray: '#9ca3af',
                darkGray: '#374151',
                white: '#ffffff'
            };

            // ========== HEADER SECTION ==========
            // Draw header background
            doc.rect(0, 0, 595, 150)
               .fill(colors.primary);

            // Company name
            doc.fontSize(28)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('MONTRÉA', 50, 45);

            doc.fontSize(11)
               .font('Helvetica')
               .fillColor(colors.secondary)
               .text('Fashion E-commerce', 50, 80);

            // Report title on right
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('SALES REPORT', 300, 50, { align: 'right', width: 245 });

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
               .fillColor(colors.lightGray)
               .text(`Period: ${dateRangeText}`, 300, 85, { align: 'right', width: 245 })
               .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 300, 100, { align: 'right', width: 245 });

            // ========== SUMMARY CARDS SECTION ==========
            let currentY = 170;

            // Summary Section Header
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Overview Summary', 50, currentY);

            currentY += 30;

            // Draw 3 summary cards in a row
            const cardWidth = 155;
            const cardHeight = 70;
            const cardGap = 15;

            // Card 1: Total Orders
            doc.rect(50, currentY, cardWidth, cardHeight)
               .fill(colors.lightGray);
            
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(colors.mediumGray)
               .text('Total Orders', 60, currentY + 15, { width: cardWidth - 20 });
            
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text(reportData.totalOrders.toString(), 60, currentY + 35, { width: cardWidth - 20 });

            // Card 2: Total Sales
            doc.rect(50 + cardWidth + cardGap, currentY, cardWidth, cardHeight)
               .fill(colors.lightGray);
            
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(colors.mediumGray)
               .text('Total Sales', 60 + cardWidth + cardGap, currentY + 15, { width: cardWidth - 20 });
            
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor(colors.success)
               .text(`Rs.${reportData.totalSales.toLocaleString('en-IN')}`, 60 + cardWidth + cardGap, currentY + 35, { width: cardWidth - 20 });

            // Card 3: Items Sold
            doc.rect(50 + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight)
               .fill(colors.lightGray);
            
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(colors.mediumGray)
               .text('Items Sold', 60 + (cardWidth + cardGap) * 2, currentY + 15, { width: cardWidth - 20 });
            
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor(colors.info)
               .text(reportData.totalItemsSold.toString(), 60 + (cardWidth + cardGap) * 2, currentY + 35, { width: cardWidth - 20 });

            currentY += cardHeight + 30;

            // ========== FINANCIAL BREAKDOWN ==========
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Financial Breakdown', 50, currentY);

            currentY += 25;

            // Financial breakdown box
            const financialBoxHeight = 110;
            doc.rect(50, currentY, 495, financialBoxHeight)
               .fillAndStroke(colors.lightGray, colors.mediumGray);

            const financialData = [
                { label: 'Product Subtotal', value: `Rs.${reportData.totalSubtotal.toLocaleString('en-IN')}`, color: colors.darkGray },
                { label: 'Product Discounts', value: `-Rs.${reportData.totalDiscount.toLocaleString('en-IN')}`, color: colors.danger },
                { label: 'Coupon Discounts', value: `-Rs.${reportData.totalCouponDiscount.toLocaleString('en-IN')}`, color: colors.danger },
                { label: 'Shipping Charges', value: `+Rs.${reportData.totalShipping.toLocaleString('en-IN')}`, color: colors.darkGray },
                { label: 'Tax (GST 18%)', value: `+Rs.${reportData.totalTax.toLocaleString('en-IN')}`, color: colors.darkGray }
            ];

            let financialY = currentY + 15;
            financialData.forEach((item, index) => {
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor(colors.mediumGray)
                   .text(item.label, 65, financialY);
                
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor(item.color)
                   .text(item.value, 350, financialY, { align: 'right', width: 180 });
                
                financialY += 18;
            });

            // Net Revenue (highlighted)
            currentY += financialBoxHeight + 10;
            doc.rect(50, currentY, 495, 40)
               .fill(colors.success);
            
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('Net Revenue', 65, currentY + 12);
            
            doc.fontSize(18)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text(`Rs.${reportData.totalSales.toLocaleString('en-IN')}`, 350, currentY + 10, { align: 'right', width: 180 });

            currentY += 60;

            // Add new page for rest of content
            doc.addPage();
            currentY = 50;

            // ========== RETURNS & CANCELLATIONS ==========
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Returns & Cancellations', 50, currentY);

            currentY += 25;

            const returnsBoxHeight = 110;
            doc.rect(50, currentY, 495, returnsBoxHeight)
               .fillAndStroke('#fee2e2', colors.danger);

            const returnsData = [
                { label: 'Cancelled Items', value: reportData.totalCancellations.toString() },
                { label: 'Cancellation Refunds', value: `Rs.${reportData.totalCancellationAmount.toLocaleString('en-IN')}` },
                { label: 'Returned Items', value: reportData.totalReturns.toString() },
                { label: 'Return Refunds', value: `Rs.${reportData.totalReturnAmount.toLocaleString('en-IN')}` },
                { label: 'Total Refunds', value: `Rs.${reportData.totalRefunds.toLocaleString('en-IN')}` }
            ];

            let returnsY = currentY + 15;
            returnsData.forEach((item) => {
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor(colors.danger)
                   .text(item.label, 65, returnsY);
                
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor(colors.danger)
                   .text(item.value, 350, returnsY, { align: 'right', width: 180 });
                
                returnsY += 18;
            });

            currentY += returnsBoxHeight + 30;

            // ========== PAYMENT METHOD BREAKDOWN ==========
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Payment Method Breakdown', 50, currentY);

            currentY += 25;

            Object.entries(reportData.paymentBreakdown).forEach(([method, data]) => {
                const percentage = reportData.totalOrders > 0 
                    ? ((data.count / reportData.totalOrders) * 100).toFixed(1) 
                    : 0;

                // Payment method card
                doc.rect(50, currentY, 495, 35)
                   .fill(colors.lightGray);
                
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor(colors.primary)
                   .text(method, 65, currentY + 10);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor(colors.mediumGray)
                   .text(`${data.count} orders (${percentage}%)`, 200, currentY + 12);
                
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor(colors.success)
                   .text(`Rs.${Math.round(data.amount).toLocaleString('en-IN')}`, 400, currentY + 10, { align: 'right', width: 130 });
                
                currentY += 45;
            });

            currentY += 10;

            // ========== ORDER STATUS BREAKDOWN ==========
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Order Status Breakdown', 50, currentY);

            currentY += 25;

            const statusColors = {
                'Placed': colors.warning,
                'Processing': colors.info,
                'Shipped': '#8b5cf6',
                'Out for Delivery': '#06b6d4',
                'Delivered': colors.success,
                'Cancelled': colors.danger,
                'Partially Cancelled': '#f97316',
                'Partially Delivered': '#84cc16'
            };

            Object.entries(reportData.statusBreakdown).forEach(([status, count]) => {
                if (count > 0) {
                    const percentage = reportData.totalOrders > 0 
                        ? ((count / reportData.totalOrders) * 100).toFixed(1) 
                        : 0;

                    const statusColor = statusColors[status] || colors.mediumGray;

                    doc.rect(50, currentY, 495, 30)
                       .fill(colors.lightGray);
                    
                    // Status indicator dot
                    doc.circle(65, currentY + 15, 5)
                       .fill(statusColor);
                    
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .fillColor(colors.primary)
                       .text(status, 80, currentY + 9);
                    
                    doc.fontSize(10)
                       .font('Helvetica')
                       .fillColor(colors.mediumGray)
                       .text(`${count} orders`, 250, currentY + 10);
                    
                    doc.fontSize(10)
                       .font('Helvetica-Bold')
                       .fillColor(statusColor)
                       .text(`${percentage}%`, 480, currentY + 10, { align: 'right', width: 50 });
                    
                    currentY += 35;
                }
            });

            // Add new page for order details table
            doc.addPage();
            currentY = 50;

            // ========== ORDER DETAILS TABLE ==========
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Order Details', 50, currentY);

            currentY += 30;

            // Table header
            doc.rect(50, currentY, 495, 30)
               .fill(colors.primary);

            const headerColumns = [
                { text: 'Order ID', x: 55, width: 85 },
                { text: 'Date', x: 145, width: 65 },
                { text: 'Customer', x: 215, width: 75 },
                { text: 'Payment', x: 295, width: 65 },
                { text: 'Status', x: 365, width: 70 },
                { text: 'Items', x: 440, width: 35 },
                { text: 'Amount', x: 480, width: 60 }
            ];

            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor(colors.white);

            headerColumns.forEach(col => {
                doc.text(col.text, col.x, currentY + 10, { width: col.width });
            });

            currentY += 35;

            // Table rows
            doc.fontSize(8)
               .font('Helvetica');

            const maxOrders = 15;
            reportData.orders.slice(0, maxOrders).forEach((order, index) => {
                // Calculate actual values
                const validItems = order.items.filter(item => 
                    item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned'
                );
                
                const actualSubtotal = order.subtotal - 
                    order.items.filter(i => i.itemStatus === 'Cancelled').reduce((s, i) => s + i.itemTotal, 0) -
                    order.items.filter(i => i.itemStatus === 'Returned').reduce((s, i) => s + i.itemTotal, 0);
                
                let actualAmount = 0;
                if (validItems.length > 0) {
                    const actualCouponDiscount = order.couponApplied && order.discountAmount > 0 
                        ? Math.round(order.discountAmount * (actualSubtotal / order.subtotal))
                        : 0;
                    const subtotalAfterCoupon = actualSubtotal - actualCouponDiscount;
                    const actualShipping = subtotalAfterCoupon >= 1000 ? 0 : 50;
                    const actualTax = Math.round(subtotalAfterCoupon * 0.18);
                    actualAmount = subtotalAfterCoupon + actualShipping + actualTax;
                }
                
                const itemsSold = validItems.reduce((sum, item) => sum + item.quantity, 0);

                // Alternate row colors
                if (index % 2 === 0) {
                    doc.rect(50, currentY - 5, 495, 20)
                       .fill(colors.lightGray);
                }

                doc.fillColor(colors.darkGray)
                   .text(order.orderId, 55, currentY, { width: 85 })
                   .text(new Date(order.placedAt).toLocaleDateString('en-IN'), 145, currentY, { width: 65 })
                   .text(order.userId?.name || 'N/A', 215, currentY, { width: 75, ellipsis: true })
                   .text(order.paymentMethod, 295, currentY, { width: 65 })
                   .text(order.orderStatus, 365, currentY, { width: 70, ellipsis: true })
                   .text(itemsSold.toString(), 440, currentY, { width: 35 });

                doc.font('Helvetica-Bold')
                   .fillColor(actualAmount > 0 ? colors.success : colors.danger)
                   .text(`Rs.${Math.round(actualAmount).toLocaleString('en-IN')}`, 480, currentY, { width: 60, align: 'right' });

                currentY += 20;
                doc.font('Helvetica');

                if (currentY > 750) {
                    doc.addPage();
                    currentY = 50;
                }
            });

            if (reportData.orders.length > maxOrders) {
                currentY += 10;
                doc.fontSize(9)
                   .fillColor(colors.mediumGray)
                   .text(`... and ${reportData.orders.length - maxOrders} more orders`, 50, currentY, { align: 'center', width: 495 });
            }

            // ========== FOOTER ==========
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                
                // Footer background
                doc.rect(0, 792 - 40, 595, 40)
                   .fill(colors.lightGray);
                
                doc.fontSize(8)
                   .fillColor(colors.mediumGray)
                   .text('MONTRÉA - Fashion E-commerce | © 2025 All Rights Reserved', 50, 792 - 25, { align: 'center', width: 495 });
                
                doc.text(`Page ${i + 1} of ${pageCount}`, 50, 792 - 25, { align: 'right', width: 495 });
            }

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