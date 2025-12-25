import Order from "../../models/orderSchema.js";
import statusCodes from "../../utils/statusCodes.js";
import { getPaginateData } from "../../utils/helpers.js";
import { creditWallet , calculateItemRefundAmount, calculateRefundAmount, calculateItemReturnAmount} from '../../utils/walletHelper.js';
import { sendResponse } from "../../utils/responseHandler.js";

export const getReturnRequests = async (req,res,next) =>{
    try {
        const {status , search} = req.query;

        let filter = {
            'items.returnRequested' : true
        };

        if(status && status !== 'all'){
            filter['item.returnStatus'] = status;
        }

        const {data: orders, totalPages, currentPage, search: currentSearch} = await getPaginateData(Order, req,{
            filters: filter,
            searchFields: ['orderId', 'shippingAddress.fullName', 'shippingAddress.phone'],
            sort :{ createdAt: -1},
            limit : 10,
            lookup: {
                from: 'users',
                local: 'userId',
                foreign: '_id',
                as: 'user',
                searchOn: 'user.email'
            }
        });

        const returnRequests = [];
        orders.forEach(order =>{
            order.items.forEach(item =>{
                if(item.returnRequested){
                    returnRequests.push({
                        orderId: order.orderId,
                        orderDate: order.placedAt,
                        itemId: item._id,
                        productName: item.name,
                        color: item.color,
                        size: item.size,
                        quantity: item.quantity,
                        image: item.image,
                        priceAtPurchase: item.priceAtPurchase,
                        discountedPriceAtPurchase: item.discountedPriceAtPurchase,
                        itemTotal: item.itemTotal,
                        returnReason: item.returnReason,
                        returnStatus: item.returnStatus,
                        returnRequestedAt: item.returnRequestedAt,
                        returnProcessedAt: item.returnProcessedAt,
                        customerName: order.shippingAddress.fullName,
                        customerEmail: order.user?.[0]?.email || '',
                        customerPhone: order.shippingAddress.phone,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        refundAmount: calculateItemReturnAmount(item, order)
                    });
                }
            });
        });

        const stats = {
            requested: await Order.countDocuments({
                'items.returnRequested': true,
                'items.returnStatus': 'requested'
            }),
            approved: await Order.countDocuments({
                'items.returnRequested': true,
                'items.returnStatus': 'approved'
            }),
            rejected: await Order.countDocuments({
                'items.returnRequested': true,
                'items.returnStatus': 'rejected'
            }),
            completed: await Order.countDocuments({
                'items.returnRequested': true,
                'items.returnStatus': 'completed'
            })
        };

        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('admin/return-management',{
            Title: 'Return & Refund Management',
            activePage: 'refund-return',
            returnRequests,
            stats,
            currentStatus: status || 'all',
            currentSearch: currentSearch || '',
            currentPage,
            totalPages,
            totalCount: returnRequests.length,
            messages,
            pageCSS: '/public/css/admin/return-management.css',
            pageJS: '/public/js/admin/return-management.js'
        });
    } catch (err) {
        console.error("Error in getReturnRequests :",err);
        next(err)
    }
}


export const updateReturnStatus = async (req, res, next) => {
    try {
        const { orderId, itemId, status, adminNotes } = req.body;
        
        if (!['approved', 'rejected', 'completed'].includes(status)) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid status'
            });
        }
        
        // Find the order
        const order = await Order.findOne({ orderId });
        if (!order) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Order not found'
            });
        }
        
        // Find the item
        const item = order.items.id(itemId);
        if (!item) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in order'
            });
        }
        
        if (!item.returnRequested) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This item has no return request'
            });
        }
        
        // Update status
        item.returnStatus = status;
        
        // Save admin notes for rejected returns
        if (status === 'rejected' && adminNotes) {
            item.adminNotes = adminNotes;
            item.itemStatus = 'Delivered';
        }
        
        if (status === 'approved') {
            // Don't change item status yet, wait for refund completion
            if (adminNotes) {
                item.adminNotes = adminNotes;
            }
        }
        
        if (status === 'completed') {
            item.returnProcessedAt = new Date();
            item.itemStatus = 'Returned';
            
            
            const refundAmount = calculateItemReturnAmount(item, order);
            
            if (refundAmount > 0) {
                await creditWallet(
                    order.userId,
                    refundAmount,
                    `Refund for returned item: ${item.name}`,
                    order._id,
                    order.orderId
                );
            }
        }
        
        await order.save();
        
        let message = '';
        if (status === 'approved') {
            message = 'Return approved successfully';
        } else if (status === 'rejected') {
            message = 'Return rejected successfully';
        } else if (status === 'completed') {
            const refundAmount = calculateItemReturnAmount(item, order);
            message = `Return completed. ₹${Math.round(refundAmount)} refunded to customer's wallet`;
        }
        
        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: message,
            data: {
                refundAmount: status === 'completed' ? calculateItemReturnAmount(item, order) : 0
            }
        });
        
    } catch (err) {
        console.error('Error in updateReturnStatus:', err);
        next(err);
    }
};


export const processRefund = async (req, res, next) => {
    try {
        const { orderId, itemId } = req.body;
        
        const order = await Order.findOne({ orderId });
        if (!order) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Order not found'
            });
        }
        
        const item = order.items.id(itemId);
        if (!item) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in order'
            });
        }
        
        if (item.returnStatus !== 'approved') {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Only approved returns can be refunded'
            });
        }
        
        
        item.returnStatus = 'completed';
        item.returnProcessedAt = new Date();
        item.itemStatus = 'Returned';
        
        const refundAmount = calculateItemReturnAmount(item, order);
        
        if (refundAmount > 0) {
            await creditWallet(
                order.userId,
                refundAmount,
                `Refund for returned item: ${item.name}`,
                order._id,
                order.orderId
            );
        }
        
        await order.save();
        
        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: `Refund of ₹${Math.round(refundAmount)} processed successfully and credited to wallet`,
            data: { refundAmount }
        });
        
    } catch (err) {
        console.error('Error in processRefund:', err);
        next(err);
    }
};