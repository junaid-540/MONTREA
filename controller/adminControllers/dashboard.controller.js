import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import User from "../../models/userSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";


export const getDashboard = async (req,res,next)=>{
    try {
        const successMessage = req.session.successMessage;
        delete req.session.successMessage

        const timeFilter = req.query.timeFilter || 'monthly';
        const year = parseInt(req.query.year) || new Date().getFullYear();

        let startDate , endDate;
        const now = new Date()

        switch (timeFilter){
            case 'daily':
                startDate = new Date(now.setDate(now.getDate() - 7 ));
                endDate = new Date();
                break;
            case 'weekly': 
                startDate = new Date(now.setDate(now.getDate() - 28 ));
                endDate = new Date();
                break;
            case 'monthly':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59);
                break;
            case 'quarterly':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59);
                break;
            case 'yearly':
                startDate = new Date(year, - 4, 0, 1)
                endDate = new Date(year, 11, 31, 23, 59, 59);
                break;
            default:
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59);
        }

        const salesData = await getSalesChartData(timeFilter, year, startDate, endDate);
        const topProducts = await getTopProducts();
        const topCategories = await getTopCategories();
        const topCustomers = await getTopCustomers();

        res.render('admin/dashboard',{
            admin:req.session.admin,
            successMessage,
            Title:"Dashboard",
            activePage:'dashboard',
            pageCSS: '/public/css/admin/dashboard.css',
            salesData: JSON.stringify(salesData),
            topCategories,
            topProducts,
            topCustomers,
            currentYear: year,
            currentFilter: timeFilter
        })
    } catch (err) {
        console.error("Dashboard Error:",err)
        next()        
    }
}


async function getSalesChartData(timeFilter, year, startDate, endDate) {
    let labels = [];
    let data = [];

    const orders = await Order.find({
        placedAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'Paid'
    }).select('totalAmount placedAt');

    if (timeFilter === 'daily') {
        // Last 7 days
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        data = new Array(7).fill(0);
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        orders.forEach(order => {
            const orderDate = new Date(order.placedAt);
            const diffDays = Math.floor((orderDate - monday) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                data[diffDays] += order.totalAmount;
            }
        });
    } else if (timeFilter === 'weekly') {
        // Last 4 weeks
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        data = new Array(4).fill(0);

        orders.forEach(order => {
            const weekNumber = Math.floor((new Date() - new Date(order.placedAt)) / (1000 * 60 * 60 * 24 * 7));
            if (weekNumber >= 0 && weekNumber < 4) {
                data[3 - weekNumber] += order.totalAmount;
            }
        });
    } else if (timeFilter === 'monthly') {
        // 12 months
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        data = new Array(12).fill(0);

        orders.forEach(order => {
            const month = new Date(order.placedAt).getMonth();
            data[month] += order.totalAmount;
        });
    } else if (timeFilter === 'quarterly') {
        // 4 quarters
        labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        data = new Array(4).fill(0);

        orders.forEach(order => {
            const quarter = Math.floor(new Date(order.placedAt).getMonth() / 3);
            data[quarter] += order.totalAmount;
        });
    } else if (timeFilter === 'yearly') {
        // Last 5 years
        const currentYear = new Date().getFullYear();
        labels = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());
        data = new Array(5).fill(0);

        orders.forEach(order => {
            const orderYear = new Date(order.placedAt).getFullYear();
            const yearIndex = labels.indexOf(orderYear.toString());
            if (yearIndex !== -1) {
                data[yearIndex] += order.totalAmount;
            }
        });
    }

    return { labels, data };
}


async function getTopProducts() {
    const topProducts = await Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                totalSales: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.itemTotal' }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $project: {
                name: '$product.name',
                sales: '$totalSales',
                revenue: '$revenue'
            }
        }
    ]);

    return topProducts;
}


async function getTopCategories() {
    const topCategories = await Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $group: {
                _id: '$product.categoryId',
                totalSales: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.itemTotal' }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: '$category' },
        {
            $project: {
                name: '$category.name',
                sales: '$totalSales',
                revenue: '$revenue'
            }
        }
    ]);

    return topCategories;
}


async function getTopCustomers() {
    const topCustomers = await Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        {
            $group: {
                _id: '$userId',
                totalSpent: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                name: '$user.name',
                email: '$user.email',
                sales: '$totalSpent',
                orderCount: '$orderCount'
            }
        }
    ]);

    return topCustomers;
}