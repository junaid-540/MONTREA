import Order from "../../models/orderSchema.js";
import { getPaginateData } from "../../utils/helpers.js";
import User from "../../models/userSchema.js";
import statusCodes from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseHandler.js";
import errorMessages from "../../utils/errorMessages.js";
import ProductVariant from "../../models/productVariantSchema.js";


export const getOrders = async (req,res,next) =>{
    try {
        const {status , payment , search} = req.query;

        const filters = {};
        
        if(status) filters.orderStatus = status;
        if(payment) filters.paymentStatus = payment;

        const {data: allOrders , totalPages , currentPage} = await getPaginateData(Order,req,{
            filters,
            searchFields:['orderId', 'shippingAddress.fullName', 'shippingAddress.phone','items.name'],
            sort: {createdAt:-1},
            limit: 10,
            lookup:{
                from: 'users',
                local: 'userId',
                foreign: '_id',
                as: 'user',
                searchOn: 'user.name'
            }
        });

        //  Filter out Razorpay pending/failed orders AFTER fetching
        const orders = allOrders.filter(order => {
            if (order.paymentMethod === 'COD') return true;
            
            if (order.paymentStatus === 'Paid') return true;
            
            return false;
        });

        const transformedOrder = orders.map(order =>({
            ...order,
            user: order.user || {name: 'N/A' , email: ''}
        }));

        const messages = req.session.messages || [];
        delete req.session.messages
        
        res.render('admin/order-management',{
            Title: 'Order Management',
            orders: transformedOrder,
            currentPage,
            totalPages,
            messages,
            status: status || '',
            payment: payment || '',
            search: search || '',
            pageCSS: '/public/css/admin/order-management.css',
            pageJS: null,
            activePage: 'order'
        })

    } catch (err) {
        console.error('Error in getOrders:', err);
        next(err);
    }
}


export const getUpdateOrder = async (req,res,next) =>{
    try {
        const {orderId} = req.params;
        const order = await Order.findOne({orderId}).populate('userId', 'name email phone').lean();

        if(!order){
            req.session.messages = req.session.messages || [];
            req.session.messages.push({
                type:'error',
                text:'Order not found'
            });
            return res.redirect('/admin/order');
        }
       
        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('admin/update-order',{
            Title: `Order ${orderId}`,
            order,
            messages,
            pageCSS: '/public/css/admin/update-order.css',
            pageJS: '/public/js/admin/update-order.js',
            activePage: 'order'
        })
    } catch (err) {
        console.error("Error in getUpdateOrder :",err);
        next(err)
    }
}

export const updateItemStatus = async (req, res, next) => {
    try {
        const { orderId, itemId } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['Pending','Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        
        if (!allowedStatuses.includes(status)) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid status'
            });
        }

        const order = await Order.findOne({ orderId }).populate('userId');
        if (!order) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.ORDER_NOT_FOUND
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

        if (item.returnRequested) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Cannot update status while return is being processed'
            });
        }

        const oldStatus = item.itemStatus;
        if (oldStatus === status) {
            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                data: { orderStatus: order.orderStatus }
            });
        }
     
        if (status === 'Cancelled' && !['Placed', 'Processing'].includes(oldStatus)) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Item cannot be cancelled at this stage'
            });
        }

        
        item.itemStatus = status;
        
        if (status === "Cancelled") {
            item.cancelReason = 'Cancelled by admin';
            item.cancelledAt = new Date();

            await ProductVariant.findByIdAndUpdate(
                item.productVariantId,
                { $inc: { stock: item.quantity } }
            );
        }
        
        
        if (status === "Delivered") {
            item.deliveredAt = new Date();
        
        }

        
        const cancelledItems = order.items.filter(i => i.itemStatus === "Cancelled").length;
        const deliveredItems = order.items.filter(i => i.itemStatus === "Delivered").length;
        const totalItems = order.items.length;

        if (cancelledItems === totalItems) {
            order.orderStatus = "Cancelled";
            order.cancelledAt = new Date();
        } else if (cancelledItems > 0) {
            order.orderStatus = "Partially Cancelled";
        } else if (deliveredItems === totalItems) {
            order.orderStatus = "Delivered";
            order.deliveredAt = new Date(); //  Set order deliveredAt
            order.paymentStatus = 'Paid';
        } else if (deliveredItems > 0 && deliveredItems < totalItems) {
            order.orderStatus = "Partially Delivered";
        } else {
            const statusOrder = { 'Pending': 0, 'Placed': 1, 'Processing': 2, 'Shipped': 3, 'Out for Delivery': 4, 'Delivered': 5 };
            const maxStatus = order.items
                .filter(i => i.itemStatus !== 'Cancelled')
                .reduce((max, i) => statusOrder[i.itemStatus] > (statusOrder[max] || 0) ? i.itemStatus : max, 'Placed');
            order.orderStatus = maxStatus;
        }

        const updateExpectedDelivery = (order) => {
            if (order.orderStatus === 'Cancelled') {
                order.expectedDelivery = null;
                return;
            }

            const statusOrder = {'Pending': 0, 'Placed': 1, 'Processing': 2, 'Shipped': 3, 'Out for Delivery': 4, 'Delivered': 5 };
            const nonCancelled = order.items.filter(i => i.itemStatus !== 'Cancelled');
            
            if (nonCancelled.length === 0) {
                order.expectedDelivery = null;
                return;
            }

            const maxStatus = nonCancelled.reduce((max, i) => 
                statusOrder[i.itemStatus] > (statusOrder[max] || 0) ? i.itemStatus : max, 'Placed');

            if (maxStatus === 'Delivered') {
                order.expectedDelivery = order.deliveredAt || new Date();
                return;
            }

            const daysToAdd = {
                'Placed': 7,
                'Processing': 6,
                'Shipped': 3,
                'Out for Delivery': 1
            };

            let baseDate = order.placedAt;
            
            if (['Shipped', 'Out for Delivery'].includes(maxStatus)) {
                baseDate = new Date();
            }

            const expected = new Date(baseDate);
            expected.setDate(expected.getDate() + (daysToAdd[maxStatus] || 7));
            order.expectedDelivery = expected;
        };

        updateExpectedDelivery(order);

        await order.save();

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Item status updated successfully',
            data: { orderStatus: order.orderStatus }
        });
        
    } catch (err) {
        console.error("Error in updating item status: ", err);
        next(err);
    }
};