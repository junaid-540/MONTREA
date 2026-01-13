import PDFDocument from 'pdfkit';

export const generateSalesReportPDF = (reportData, stream) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 40,
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
                lightGray: '#f9fafb',
                mediumGray: '#9ca3af',
                darkGray: '#374151',
                white: '#ffffff',
                border: '#e5e7eb'
            };

            // ========== HEADER SECTION ==========
            doc.rect(0, 0, 595, 120)
               .fill(colors.primary);

            doc.fontSize(26)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('MONTRÉA', 40, 35);

            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(colors.secondary)
               .text('Fashion E-commerce', 40, 65);

            doc.fontSize(20)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('SALES REPORT', 320, 40, { align: 'right', width: 235 });

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

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(colors.lightGray)
               .text(`Period: ${dateRangeText}`, 320, 70, { align: 'right', width: 235 })
               .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 320, 85, { align: 'right', width: 235 });

            // ========== KEY METRICS SECTION ==========
            let currentY = 140;

            const metricWidth = 127;
            const metricHeight = 55;
            const metricGap = 10;

            const metrics = [
                { label: 'Orders', value: reportData.totalOrders.toString(), color: colors.primary },
                { label: 'Total Sales', value: ` ${reportData.totalSales.toLocaleString('en-IN')}`, color: colors.success },
                { label: 'Items Sold', value: reportData.totalItemsSold.toString(), color: colors.info },
                { label: 'Total Discount', value: ` ${reportData.totalDiscount.toLocaleString('en-IN')}`, color: colors.danger }
            ];

            metrics.forEach((metric, index) => {
                const x = 40 + (metricWidth + metricGap) * index;
                
                doc.rect(x, currentY, metricWidth, metricHeight)
                   .fill(colors.lightGray);
                
                doc.fontSize(8)
                   .font('Helvetica')
                   .fillColor(colors.mediumGray)
                   .text(metric.label, x + 10, currentY + 12, { width: metricWidth - 20 });
                
                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .fillColor(metric.color)
                   .text(metric.value, x + 10, currentY + 28, { width: metricWidth - 20 });
            });

            currentY += metricHeight + 20;

            // ========== FINANCIAL SUMMARY (2 Columns) ==========
            doc.fontSize(13)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Financial Summary', 40, currentY);

            currentY += 20;

            const colWidth = 250;
            doc.rect(40, currentY, colWidth, 100)
               .fillAndStroke(colors.lightGray, colors.border);

            const leftData = [
                { label: 'Product Subtotal', value: ` ${reportData.totalSubtotal.toLocaleString('en-IN')}` },
                { label: 'Product Discounts', value: `- ${reportData.totalDiscount.toLocaleString('en-IN')}`, isNegative: true },
                { label: 'Coupon Discounts', value: `- ${reportData.totalCouponDiscount.toLocaleString('en-IN')}`, isNegative: true },
                { label: 'Shipping', value: `+ ${reportData.totalShipping.toLocaleString('en-IN')}` },
                { label: 'GST (18%)', value: `+ ${reportData.totalTax.toLocaleString('en-IN')}` }
            ];

            let leftY = currentY + 12;
            leftData.forEach(item => {
                doc.fontSize(9)
                   .font('Helvetica')
                   .fillColor(colors.darkGray)
                   .text(item.label, 50, leftY);
                
                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .fillColor(item.isNegative ? colors.danger : colors.darkGray)
                   .text(item.value, 180, leftY, { align: 'right', width: 100 });
                
                leftY += 18;
            });

            // Right column - Returns & Refunds
            doc.rect(305, currentY, colWidth, 100)
               .fillAndStroke('#fef2f2', colors.danger);

            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor(colors.danger)
               .text('Returns & Refunds', 315, currentY + 12);

            const rightData = [
                { label: 'Cancelled Items', value: reportData.totalCancellations.toString() },
                { label: 'Returned Items', value: reportData.totalReturns.toString() },
                { label: 'Total Refunds', value: ` ${reportData.totalRefunds.toLocaleString('en-IN')}` }
            ];

            let rightY = currentY + 35;
            rightData.forEach(item => {
                doc.fontSize(9)
                   .font('Helvetica')
                   .fillColor(colors.danger)
                   .text(item.label, 315, rightY);
                
                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .fillColor(colors.danger)
                   .text(item.value, 450, rightY, { align: 'right', width: 95 });
                
                rightY += 18;
            });

            currentY += 110;

            // Net Revenue Highlight
            doc.rect(40, currentY, 515, 35)
               .fill(colors.success);
            
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text('NET REVENUE', 50, currentY + 11);
            
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor(colors.white)
               .text(` ${reportData.totalSales.toLocaleString('en-IN')}`, 400, currentY + 9, { align: 'right', width: 145 });

            currentY += 50;

            // ========== PAYMENT & STATUS BREAKDOWN (Compact) ==========
            doc.fontSize(13)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Payment Methods', 40, currentY);
            
            doc.text('Order Status', 305, currentY);

            currentY += 20;

            // Payment methods (left column)
            let paymentY = currentY;
            Object.entries(reportData.paymentBreakdown).forEach(([method, data]) => {
                const percentage = reportData.totalOrders > 0 
                    ? ((data.count / reportData.totalOrders) * 100).toFixed(1) 
                    : 0;

                doc.rect(40, paymentY, 250, 25)
                   .fill(colors.lightGray);
                
                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .fillColor(colors.primary)
                   .text(method, 50, paymentY + 8);
                
                doc.fontSize(8)
                   .font('Helvetica')
                   .fillColor(colors.mediumGray)
                   .text(`${data.count} orders (${percentage}%)`, 140, paymentY + 9);
                
                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .fillColor(colors.success)
                   .text(` ${Math.round(data.amount).toLocaleString('en-IN')}`, 200, paymentY + 8, { align: 'right', width: 80 });
                
                paymentY += 30;
            });

            // Order status (right column)
            const statusColors = {
                'Placed': colors.warning,
                'Processing': colors.info,
                'Shipped': '#8b5cf6',
                'Out for Delivery': '#06b6d4',
                'Delivered': colors.success,
                'Cancelled': colors.danger,
                'Partially Cancelled': '#f97316',
                'Partially Delivered': '#84cc16',
                'Returned': '#dc2626'
            };

            let statusY = currentY;
            Object.entries(reportData.statusBreakdown).forEach(([status, count]) => {
                if (count > 0) {
                    const percentage = reportData.totalOrders > 0 
                        ? ((count / reportData.totalOrders) * 100).toFixed(1) 
                        : 0;

                    const statusColor = statusColors[status] || colors.mediumGray;

                    doc.rect(305, statusY, 250, 25)
                       .fill(colors.lightGray);
                    
                    doc.circle(315, statusY + 12, 4)
                       .fill(statusColor);
                    
                    doc.fontSize(9)
                       .font('Helvetica')
                       .fillColor(colors.darkGray)
                       .text(status, 325, statusY + 8, { width: 140, ellipsis: true });
                    
                    doc.fontSize(8)
                       .font('Helvetica')
                       .fillColor(colors.mediumGray)
                       .text(`${count} (${percentage}%)`, 470, statusY + 9, { align: 'right', width: 75 });
                    
                    statusY += 30;
                }
            });

            currentY = Math.max(paymentY, statusY) + 10;

            // ========== ORDER ITEMS DETAILS TABLE - SHOWING ALL ITEMS ==========
            doc.addPage();
            currentY = 40;

            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Complete Order Items Breakdown', 40, currentY);
            
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor(colors.mediumGray)
               .text('(Includes all items: Delivered, Cancelled, and Returned)', 40, currentY + 18);

            currentY += 35;

            // Table header
            doc.rect(40, currentY, 515, 25)
               .fill(colors.primary);

            const headers = [
                { text: 'Order ID', x: 45, width: 65 },
                { text: 'Date', x: 115, width: 45 },
                { text: 'Product', x: 165, width: 95 },
                { text: 'Variant', x: 265, width: 50 },
                { text: 'Qty', x: 320, width: 20 },
                { text: 'Price', x: 345, width: 40 },
                { text: 'Disc', x: 390, width: 35 },
                { text: 'Status', x: 430, width: 60 },
                { text: 'Total', x: 495, width: 55 }
            ];

            doc.fontSize(8)
               .font('Helvetica-Bold')
               .fillColor(colors.white);

            headers.forEach(col => {
                doc.text(col.text, col.x, currentY + 8, { width: col.width });
            });

            currentY += 30;

            // Table rows - SHOW ALL ITEMS (INCLUDING CANCELLED & RETURNED)
            doc.fontSize(7)
               .font('Helvetica');

            let itemCount = 0;
            let totalRevenue = 0;
            let totalLoss = 0;

            reportData.orders.forEach((order) => {
                // Show ALL items - no filtering
                order.items.forEach((item, itemIndex) => {
                    // Check if we need a new page
                    if (currentY > 750) {
                        doc.addPage();
                        currentY = 40;
                        
                        // Redraw header on new page
                        doc.rect(40, currentY, 515, 25)
                           .fill(colors.primary);
                        
                        doc.fontSize(8)
                           .font('Helvetica-Bold')
                           .fillColor(colors.white);
                        
                        headers.forEach(col => {
                            doc.text(col.text, col.x, currentY + 8, { width: col.width });
                        });
                        
                        currentY += 30;
                        doc.fontSize(7).font('Helvetica');
                    }

                    const isCancelled = item.itemStatus === 'Cancelled';
                    const isReturned = item.itemStatus === 'Returned';
                    const isLoss = isCancelled || isReturned;

                    // Background color based on status
                    let bgColor = itemCount % 2 === 0 ? colors.lightGray : colors.white;
                    if (isCancelled) {
                        bgColor = '#fee2e2'; // Light red
                    } else if (isReturned) {
                        bgColor = '#fef3c7'; // Light yellow
                    } else if (item.itemStatus === 'Delivered') {
                        bgColor = '#d1fae5'; // Light green
                    }

                    doc.rect(40, currentY - 3, 515, 18)
                       .fill(bgColor);

                    const statusColor = statusColors[item.itemStatus] || colors.mediumGray;
                    const itemPrice = item.discountedPriceAtPurchase > 0 ? item.discountedPriceAtPurchase : item.priceAtPurchase;
                    const discount = item.priceAtPurchase - itemPrice;
                    const itemTotal = itemPrice * item.quantity;

                    // Track revenue and loss
                    if (isLoss) {
                        totalLoss += itemTotal;
                    } else {
                        totalRevenue += itemTotal;
                    }

                    // Order ID (only show for first item of each order)
                    if (itemIndex === 0) {
                        doc.fillColor(colors.info)
                           .font('Helvetica-Bold')
                           .text(order.orderId, 45, currentY, { width: 65, ellipsis: true });
                        
                        doc.font('Helvetica')
                           .fillColor(colors.darkGray)
                           .text(new Date(order.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' }), 115, currentY, { width: 45 });
                    }

                    // Product name
                    doc.fillColor(isLoss ? colors.danger : colors.darkGray)
                       .text(item.name, 165, currentY, { width: 95, ellipsis: true });
                    
                    // Variant (color/size)
                    doc.text(`${item.color}/${item.size}`, 265, currentY, { width: 50, ellipsis: true });
                    
                    // Quantity
                    doc.text(item.quantity.toString(), 320, currentY, { width: 20, align: 'center' });
                    
                    // Price
                    doc.text(` ${itemPrice.toLocaleString('en-IN')}`, 345, currentY, { width: 40, align: 'right' });
                    
                    // Discount
                    if (discount > 0) {
                        doc.fillColor(colors.danger)
                           .text(`- ${discount.toLocaleString('en-IN')}`, 390, currentY, { width: 35, align: 'right' });
                    } else {
                        doc.fillColor(colors.mediumGray)
                           .text('-', 390, currentY, { width: 35, align: 'center' });
                    }
                    
                    // Status with color indicator
                    doc.circle(433, currentY + 4, 2.5)
                       .fill(statusColor);
                    
                    doc.fillColor(statusColor)
                       .font('Helvetica-Bold')
                       .text(item.itemStatus, 440, currentY, { width: 50, ellipsis: true });
                    
                    // Item total - show in red for cancelled/returned
                    doc.font('Helvetica-Bold')
                       .fillColor(isLoss ? colors.danger : colors.success);
                    
                    if (isLoss) {
                        doc.text(`- ${itemTotal.toLocaleString('en-IN')}`, 495, currentY, { width: 55, align: 'right' });
                    } else {
                        doc.text(` ${itemTotal.toLocaleString('en-IN')}`, 495, currentY, { width: 55, align: 'right' });
                    }

                    currentY += 18;
                    itemCount++;
                    doc.font('Helvetica');
                });

                // Add a separator between orders
                if (order.items.length > 0 && currentY < 750) {
                    doc.strokeColor(colors.border)
                       .lineWidth(0.5)
                       .moveTo(40, currentY)
                       .lineTo(555, currentY)
                       .stroke();
                    currentY += 5;
                }
            });

            // Summary section at the end
            currentY += 15;
            
            // Summary box
            doc.rect(40, currentY, 515, 60)
               .fill(colors.lightGray);
            
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor(colors.primary)
               .text('Items Summary', 50, currentY + 10);
            
            currentY += 30;
            
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(colors.darkGray)
               .text(`Total Items: ${itemCount}`, 50, currentY);
            
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor(colors.success)
               .text(`Revenue from Delivered Items:  ${totalRevenue.toLocaleString('en-IN')}`, 190, currentY);
            
            doc.fillColor(colors.danger)
               .text(`Loss from Cancelled/Returned:  ${totalLoss.toLocaleString('en-IN')}`, 380, currentY, { width: 175, align: 'right' });

            // ========== FOOTER ON ALL PAGES ==========
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                
                doc.rect(0, 792 - 35, 595, 35)
                   .fill(colors.lightGray);
                
                doc.fontSize(7)
                   .fillColor(colors.mediumGray)
                   .text('MONTRÉA Fashion E-commerce | © 2025 All Rights Reserved', 40, 792 - 20, { align: 'center', width: 515 });
                
                doc.text(`Page ${i + 1} of ${pageCount}`, 40, 792 - 20, { align: 'right', width: 515 });
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