
import Order from "../../models/orderSchema.js";
import User from "../../models/userSchema.js";
import { getPaginateData } from "../../utils/helpers.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import ProductVariant from "../../models/productVariantSchema.js";
import { generateInvoice } from "../../utils/generateInvoice.js";
import errorMessages from "../../utils/errorMessages.js";


export const getOrderSuccessPage = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const orderId = req.params.orderId;

        console.log("Items =" , userId , 'order ID' , orderId)
        
        const order = await Order.findOne({ orderId, userId }).lean();

        if (!order) {
            req.session.messages = req.session.messages || [];
            req.session.messages.push({ 
                type: 'error', 
                text: 'Order not found' 
            });
            return res.redirect('/');
        }

        res.render('user/order-success', {
            Title: 'Order Success',
            order,
            user: res.locals.user || null,
            pageCss: '/public/css/user/order-success.css',
            pageJs: null,
            is404 : true,
        });
    } catch (err) {
        console.error('Error in getOrderSuccessPage:', err);
        next(err);
    }
};


export const getMyOrdersPage = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).select('name profileImage').lean()

        const {data: orders, totalPages, currentPage, search} = await getPaginateData(Order,req,{
            filters:{userId},
            searchFields: ['orderId', 'items.name'],
            sort: {createdAt: -1},
            limit: 10,
        });

        // Get total count for pagination
        const totalOrders =  await Order.countDocuments({ userId });

        const messages = req.session.messages || [];
        delete req.session.messages

        res.render('user/orders', {
            Title: 'My Orders',
            orders,
            currentPage,
            totalPages,
            totalOrders,
            messages,
            search: search || '',
            user: res.locals.user || null,
            pageCss: '/public/css/user/orders.css',
            pageJs: '/public/js/user/orders.js',
            is404: true,
            activePage: 'order',
            user:{
                name: user.name,
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg'
            }
        });
    } catch (err) {
        console.error('Error in getMyOrdersPage:', err);
        next(err);
    }
};


export const getOrderDetailsPage = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {orderId} = req.params;


        const order = await Order.findOne({orderId,userId}).lean()

        if(!order){
            console.log('ERROR: No orderId in params - redirecting to orders');
            req.session.messages = req.session.messages || []
            req.session.messages.push({
                type: 'error',
                text:'Order not found'
            });
            return res.redirect('/orders');
        }

        order.hasReturn = order.items.some(item => item.returnRequested);

        const messages = req.session.messages || [];
        delete req.session.messages

        res.render('user/order-details',{
            user: res.locals.user || null,
            order,
            Title: 'Order Details',
            messages,
            is404: true,
            pageCss: '/public/css/user/order-details.css',
            pageJs: '/public/js/user/order-details.js'
        })
    } catch (err) {
        console.error("Error in getOrderDetailsPage :",err);
        next(err)
    }
}


export const cancelOrder = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {orderId} = req.params;
        const {itemId, reason} = req.body;

        const order = await Order.findOne({orderId, userId})
        if(!order){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Order not found'
            });
        }

        if(!['Placed', 'Processing'].includes(order.orderStatus)){
            return sendResponse(res,{success:false,statusCode:statusCodes.BAD_REQUEST,message:'Order cannot be cancelled at this stage'});
        }

        if(itemId){
            const item = order.items.id(itemId);
            if(!item){
                return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:'Item not found in order'});
            }
            if(item.itemStatus === 'Cancelled'){
                return sendResponse(res,{success:false,statusCode:statusCodes.BAD_REQUEST,message:'Item is already cancelled'});
            }

            item.itemStatus = 'Cancelled';
            item.cancelReason = reason || '';
            item.cancelledAt = new Date();

            await ProductVariant.findByIdAndUpdate(
                item.productVariantId,
                {$inc: {stock: item.quantity}}
            );

            const allCancelled = order.items.every(i => i.itemStatus === 'Cancelled');
            const someCancelled = order.items.some(i => i.itemStatus === 'Cancelled');

            if(allCancelled){
                order.orderStatus = 'Cancelled';
                order.cancelledAt = new Date()
            }else if(someCancelled){
                order.orderStatus = 'Partially Cancelled'
            }

            await order.save();

            return sendResponse(res,{
                success: true,
                statusCode: statusCodes.OK,
                message: 'Item cancelled successfully'
            });
        }else{
            order.orderStatus = 'Cancelled';
            order.cancelledAt = new Date();

            order.items.forEach(item =>{
                item.itemStatus = 'Cancelled';
                item.cancelReason = reason || '';
                item.cancelledAt = new Date();
            });

            for(const item of order.items){
                await ProductVariant.findByIdAndUpdate(
                    item.productVariantId,
                    {$inc: {stock: item.quantity}}
                );
            }

            await order.save()
            return sendResponse(res,{
                success: true,
                statusCode:statusCodes.OK,
                message: 'Order cancelled successfully'
            });
        }
    } catch (err) {
        console.error("Error in cacncelOrder :",err);
        next(err)
    }
}

export const returnOrder = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {orderId} = req.params;
        const {itemId , reason} = req.body;

        if(!reason || !reason.trim()){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Return reason is required'
            });
        }

        const order  = await Order.findOne({orderId,userId})
        if(!order){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Order not found'
            });
        }
        const item = order.items.id(itemId);
        if(!item){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in order'
            });
        }

        if(item.itemStatus !== 'Delivered'){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Only delivered items can be returned'
            });
        }

        if(item.returnRequested){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Return already requested for this item'
            });
        }

        item.returnRequested = true;
        item.returnReason = reason.trim()
        item.returnStatus = 'requested';
        item.returnRequestedAt = new Date();

        await order.save()
        return sendResponse(res,{
            success:true,
            statusCode: statusCodes.OK,
            message: 'Return request submitted successfully. We will process it shortly.'
        });
    } catch (err) {
        console.error("Error in returnOrder :",err);
        next(err)
    }
}


export const downloadInvoice = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {orderId} = req.params;

        const order = await Order.findOne({orderId, userId}).lean();
        if(!order){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.ORDER_NOT_FOUND
            });
        }

        const hasReturn = order.items.some(item => item.returnRequested);
        if(order.orderStatus !== 'Delivered' && !hasReturn){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invoice available only for delivered or returned orders'
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        await generateInvoice(order,res);

    } catch (err) {
        console.error("Error in downloadInvoice :",err);
        if(!res.headersSent){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to generate invoice'
            })
        }
        next(err);
    }
}


export const getOrderFailurePage = async (req,res,next) =>{
    try {
        
        const {orderId} = req.params;
        const reason = req.query.reason || 'Payment failed';
        const userId = req.session.userId;

        const order = await Order.findOne({
            orderId: orderId,
            userId: userId
        }).lean()

        if(!order){
            return res.redirect('/orders');
        }

        res.render('user/order-failure',{
            Title: 'Payment Failed',
            order,
            reason: decodeURIComponent(reason),
            user: res.locals.user || null,
            pageCss: '/public/css/user/order-failure.css',
            is404: true
        });
    } catch (err) {
        console.error("Error in getOrderFailurePage :",err);
        next(err)
    }
}