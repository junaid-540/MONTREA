

// pagination + search // 




export const getPaginateData = async (Model,req,options = {} ) =>{
    try {
        
        const {
            searchFields = [],
            filters = {},
            sort = { createdAt: -1},
            limit = 6,
        } = options

        const page  = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit
        const search = req.query.search ? req.query.search.trim() : "";

        const searchQuery = search ? {
            $or : searchFields.map((field)=>({[field] : {$regex: search , $options: "i"},})),} : {};

        const finalQuery = {...filters,...searchQuery};

        const totalDocuments = await Model.countDocuments(finalQuery);
        const data = await Model.find(finalQuery).sort(sort).skip(skip).limit(limit);

        const totalPages = Math.ceil(totalDocuments/limit);

        return {
            data,
            totalPages,
            currentPage: page,
            search,
        };

    } catch (error) {
        console.error("Error in getPaginateData:", error);
        throw error
    }
}