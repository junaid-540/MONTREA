import PDFDocument from 'pdfkit';

export const generateInvoice = (order, stream) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4'
            });

            // Pipe to stream
            doc.pipe(stream);

            // Header
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('MONTRÉA', 50, 50)
               .fontSize(10)
               .font('Helvetica')
               .text('Fashion E-commerce', 50, 80)
               .text('Mumbai, Maharashtra, India', 50, 95)
               .moveDown();

            // Invoice Title
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text('INVOICE', 400, 50, { align: 'right' });

            // Invoice Details
            doc.fontSize(10)
               .font('Helvetica')
               .text(`Invoice #: ${order.orderId}`, 400, 80, { align: 'right' })
               .text(`Date: ${new Date(order.placedAt).toLocaleDateString('en-IN')}`, 400, 95, { align: 'right' })
               .text(`Status: ${order.orderStatus}`, 400, 110, { align: 'right' });

            // Line
            doc.moveTo(50, 140)
               .lineTo(550, 140)
               .stroke();

            // Billing Information
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('BILL TO:', 50, 160);

            doc.fontSize(10)
               .font('Helvetica')
               .text(order.shippingAddress.fullName, 50, 180)
               .text(order.shippingAddress.addressLine1, 50, 195)
               .text(`${order.shippingAddress.addressLine2 || ''}`, 50, 210)
               .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 50, 225)
               .text(`Phone: ${order.shippingAddress.phone}`, 50, 240);

            // Payment Information
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('PAYMENT INFO:', 350, 160);

               const paymentStatusText = order.paymentMethod === 'COD' && order.orderStatus === 'Delivered'
                                    ? 'Paid (Cash on delivery)'
                                    : order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1);

            doc.fontSize(10)
               .font('Helvetica')
               .text(`Method: ${order.paymentMethod}`, 350, 180)
               .text(`Status: ${paymentStatusText}`, 350, 195);

            // Line
            doc.moveTo(50, 270)
               .lineTo(550, 270)
               .stroke();

            // Table Header
            const tableTop = 290;
            doc.fontSize(10)
               .font('Helvetica-Bold');

            doc.text('Item', 50, tableTop)
               .text('Status', 260, tableTop)
               .text('Qty', 310, tableTop, { width: 40, align: 'center' })
               .text('Price', 360, tableTop, { width: 70, align: 'right' })
               .text('Total', 450, tableTop, { width: 80, align: 'right' });

            // Line under header
            doc.moveTo(50, tableTop + 15)
               .lineTo(550, tableTop + 15)
               .stroke();

            // Table Items
            let yPosition = tableTop + 25;
            doc.font('Helvetica');

            const hasCompletedReturn = order.items.some(item => item.returnStatus === 'completed');

            order.items.forEach((item, index) => {
                const itemPrice = item.discountedPriceAtPurchase > 0 
                    ? item.discountedPriceAtPurchase 
                    : item.priceAtPurchase;
                
                const itemTotal = item.itemTotal;

                // Item details
                doc.fontSize(10)
                   .text(item.name, 50, yPosition, { width: 190 })
                   .fontSize(8)
                   .fillColor('#666666')
                   .text(`${item.color} | ${item.size}`, 50, yPosition + 12, { width: 190 })
                   .fillColor('#000000');

                // Status
                let statusText = item.itemStatus;
                if (item.returnStatus !== 'none') {
                    statusText += ` | Return: ${item.returnStatus}`;
                }
                doc.fontSize(10)
                   .text(statusText, 260, yPosition, { width: 70 });

                // Quantity
                doc.fontSize(10)
                   .text(item.quantity.toString(), 310, yPosition, { width: 40, align: 'center' });

                // Price
                doc.text(`${itemPrice.toFixed(2)}`, 360, yPosition, { width: 70, align: 'right' });

                // Total
                doc.text(`${itemTotal.toFixed(2)}`, 450, yPosition, { width: 80, align: 'right' });

                yPosition += 40;

                // Add new page if needed
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }
            });

            // Line before totals
            yPosition += 10;
            doc.moveTo(50, yPosition)
               .lineTo(550, yPosition)
               .stroke();

            // Totals
            yPosition += 20;
            const totalsX = 360;

            doc.fontSize(10)
               .font('Helvetica');

            // Subtotal
            doc.text('Subtotal:', totalsX, yPosition, { width: 100, align: 'left' })
               .text(`${order.subtotal.toFixed(2)}`, 450, yPosition, { width: 80, align: 'right' });
            yPosition += 20;

            // Tax
            doc.text('Tax (GST):', totalsX, yPosition, { width: 100, align: 'left' })
               .text(`${Math.round(order.tax.toFixed(2))}`, 450, yPosition, { width: 80, align: 'right' });
            yPosition += 20;

            // Shipping
            doc.text('Shipping:', totalsX, yPosition, { width: 100, align: 'left' })
               .text(order.shippingCharge === 0 ? 'FREE' : `${order.shippingCharge.toFixed(2)}`, 450, yPosition, { width: 80, align: 'right' });
            yPosition += 20;

            // Discount (if any)
            if (order.discount > 0) {
                doc.fillColor('#10b981')
                   .text('Discount:', totalsX, yPosition, { width: 100, align: 'left' })
                   .text(`-${order.discount.toFixed(2)}`, 450, yPosition, { width: 80, align: 'right' })
                   .fillColor('#000000');
                yPosition += 20;
            }

            // Line before grand total
            doc.moveTo(350, yPosition)
               .lineTo(550, yPosition)
               .stroke();

            yPosition += 15;

            // Grand Total
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('TOTAL:', totalsX, yPosition, { width: 100, align: 'left' })
               .text(`${Math.round(order.totalAmount.toFixed(2))}`, 450, yPosition, { width: 80, align: 'right' });

            // Return note if applicable
            if (hasCompletedReturn) {
                yPosition += 30;
                doc.fontSize(9)
                   .fillColor('#666666')
                   .text('Note: This invoice reflects the original order amount.', 50, yPosition, { width: 500, align: 'center' })
                   .text('Refunds for returned items have been processed separately.', 50, yPosition + 15, { width: 500, align: 'center' })
                   .fillColor('#000000');
                yPosition += 40;
            }

            // Footer
            const footerY = Math.max(750, yPosition + 50);
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#666666')
               .text('Thank you for shopping with MONTRÉA!', 50, footerY, { align: 'center', width: 500 })
               .text('For any queries, contact us at support@montrea.com', 50, footerY + 15, { align: 'center', width: 500 });

            // Finalize PDF
            doc.end();

            // Resolve when done
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