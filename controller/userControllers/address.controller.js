import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";



export const getAddressPage = async (req,res,next) =>{
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        const addresses = await Address.find({userId:req.session.userId})
                                .sort({isDefault:-1,createdAt:-1}).lean();

        res.render('user/address',{
            activePage: 'address',
            Title: 'Manage Address',
            user:{
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg',
                name: user.name,
            },
            addresses,
            is404: true,
            pageCss: '/public/css/user/address.css',
            pageJs: '/public/js/user/address.js',
        });
    } catch (err) {
        console.error("Error in getAddressPage :",err);
        next(err)
    }
}


export const getAddAddress = async (req,res,next) =>{
    try {
        const user = await User.findById(req.session.userId)
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        res.render('user/add-address',{
            is404:true,
            Title: 'Add Address',
            activePage: 'address',
            user:{
                name: user.name,
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg',
            },
            pageCss: '/public/css/user/add-address.css',
            pageJs: '/public/js/user/add-address.js',
        });
    } catch (err) {
        console.error("Error in getAddAddress :",err);
        next(err)
    }
}


export const postAddAddress = async (req,res,next) =>{
    try {
        
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        const addressData = {
            userId,
            addressType: req.body.addressType,
            fullName: req.body.fullName.trim(),
            phone: req.body.phone.trim(),
            alternatePhone: req.body.alternatePhone?.trim() || '',
            addressLine1: req.body.addressLine1.trim(),
            addressLine2: req.body.addressLine2?.trim() || '',
            city: req.body.city.trim(),
            state: req.body.state,
            pincode: req.body.pincode.trim(),
            country: req.body.country || 'India',
            isDefault: req.body.isDefault || false
        };
        
        const addressCount = await Address.countDocuments({userId})
        if(addressCount === 0){
            addressData.isDefault = true;
        }
        if(addressData.isDefault){
            await Address.updateMany(
                {userId,isDefault:true},
                {$set:{isDefault:false}}
            );
        }


        const newAddress = new Address(addressData);
        await newAddress.save()

        return sendResponse(res,{
            success: true,
            statusCode:statusCodes.CREATED,
            message: errorMessages.ADDRESS_ADDED_SUCCESS,
            data: {redirect: '/address'}
        })

    } catch (err) {
        console.error("Error in postAddAddress : ",err)
        if(err.code === 11000){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This address already exists'
            });
        }
        next(err)
    }
}


export const getEditAddress = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;

        const user = await User.findById(userId);
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        const address = await Address.findOne({_id:addressId,userId})
        if(!address){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.ADDRESS_NOT_FOUND});
        }

        res.render('user/edit-address',{
            Title: 'Edit Address',
            is404: true,
            activePage: 'address',
            pageCss: '/public/css/user/add-address.css',
            pageJs: '/public/js/user/edit-address.js',
            user:{
                name: user.name,
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg'
            },
            address
        });
    } catch (err) {
        console.error("Error in getEditAddress :",err);
        next(err)
    }
}


export const postEditAddress = async(req,res,next) =>{
    try {
        const userId = req.session.userId
        const addressId = req.params.id;

        const address = await Address.findOne({_id:addressId,userId})
        if(!address){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.ADDRESS_NOT_FOUND});
        }

        const updatedData = {
            addressType: req.body.addressType,
            fullName: req.body.fullName.trim(),
            phone: req.body.phone.trim(),
            alternatePhone: req.body.alternatePhone?.trim() || '',
            addressLine1: req.body.addressLine1.trim(),
            addressLine2: req.body.addressLine2?.trim() || '',
            city: req.body.city.trim(),
            state: req.body.state,
            pincode: req.body.pincode.trim(),
            country: req.body.country || 'India',
            isDefault: req.body.isDefault || false
        };

        if(updatedData.isDefault && !address.isDefault){
            await Address.updateMany(
                {userId,isDefault:true,_id:{$ne:addressId}},
                {$set:{isDefault: false}}
            );
        }

        await Address.findByIdAndUpdate(addressId,updatedData);
        return sendResponse(res,{
            success:true,
            statusCode:statusCodes.OK,
            message: errorMessages.ADDRESS_UPDATED_SUCCESS,
            data:{redirect:'/address'}
        })
    } catch (err) {
        console.error("Error in postEditAddress :",err)
        next(err)
    }
}

export const deleteAddress = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;

        const address = await Address.findOneAndDelete({_id:addressId,userId});
        if(!address){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.ADDRESS_NOT_FOUND});
        }

        if(address.isDefault){
            const remainingAddress = await Address.findOne({userId}).sort({createdAt:-1});
            if(remainingAddress){
                await Address.findByIdAndUpdate(remainingAddress._id,{isDefault:true});
            }
        }

    return sendResponse(res,{
        success:true,
        statusCode:statusCodes.OK,
        message:errorMessages.ADDRESS_DELETED_SUCCESS
    });
    } catch (err) {
       console.error("Error in deleteAddress :",err);
       next(err) 
    }
}

export const setDefaultAddress = async (req,res,next) =>{
    try {
        const userId = req.session.userId
        const addressId = req.params.id

        const address = await Address.findOne({_id:addressId,userId});
        if(!address){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.ADDRESS_NOT_FOUND});
        }

        if(address.isDefault){
            return sendResponse(res,{success:true,statusCode:statusCodes.OK,message:errorMessages.ADDRESS_ALREADY_DEFAULT});
        }

        await Address.updateMany(
            {userId,isDefault:true},
            {$set:{isDefault:false}}
        );

        await Address.findByIdAndUpdate(addressId, {isDefault:true});

        return sendResponse(res,{
            success:true,
            statusCode:statusCodes.OK,
            message:errorMessages.ADDRESS_SET_DEFAULT_SUCCESS
        })
    } catch (err) {
        console.error("Error in setDefaultAddress :",err);
        next(err)
    }
}