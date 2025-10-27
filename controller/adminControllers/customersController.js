import User from "../../models/userSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import errorMessages from "../../utils/errorMessages.js";
import statusCodes from "../../utils/statusCodes.js";
import { getPaginateData } from "../../utils/helpers.js";

export const getCustomersPage = async (req, res, next) => {

    try {

        const {data:users,totalPages,currentPage,search} = await getPaginateData(User,req,{

            searchFields: ["name","email","phone"],
            filters: {status :{ $ne: "deleted"}},
        });

        // const page = parseInt(req.query.page) || 1;
        // const limit = 6;
        // const skip = (page - 1) * limit;
        // const search = req.query.search || "";


        // let query = { status: { $ne: "deleted" } };
        // if (search.trim()) {
        //     query.$or = [
        //         { name: { $regex: search, $options: "i" } },
        //         { email: { $regex: search, $options: "i" } },
        //         { phone: { $regex: search.toString(), $options: "i" } }
        //     ];
        // }

        // const totalUsers = await User.countDocuments(query);

        // const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)

        // const totalPages = Math.ceil(totalUsers / limit)

        res.render('admin/customers-management', {
            Title: 'Customer Management',
            pageCSS: '/public/css/admin/customers.css',
            pageJS: '/public/js/admin/customers.js',
            users,
            currentPage,
            totalPages,
            search,
        });
    } catch (err) {
        console.error("Error fetching customers:", err)
        next(err)
    }
}


export const toggleBlockUser = async (req, res, next) => {

    try {

        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return sendResponse(res, {
                success: false,
                message: errorMessages.USER_NOT_FOUND,
                statusCode: statusCodes.NOT_FOUND
            });
        }

        user.status = user.status === 'blocked' ? 'active' : 'blocked';
        await user.save()

        console.log("Sending response:", user.status);

        return sendResponse(res, {
            success: true,
            statusCode:statusCodes.OK,
            message: `User ${user.status === "active" ? "unblocked" : "blocked"} successfully `,
            data: { userId: user._id, status: user.status },
        });

    } catch (err) {
        console.error("Error toggling user status:", err);
        next(err)
    }

}


