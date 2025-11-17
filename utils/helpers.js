

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

        // const searchQuery = search ? {
        //     $or : searchFields.map((field)=>({[field] : {$regex: search , $options: "i"},})),} : {};

        const searchCondtions = [];
        if(search){
            searchFields.forEach((field)=>{
                searchCondtions.push({[field]: {$regex: search, $options: "i"}});
            });
            searchCondtions.push({"category.name": {$regex: search, $options: "i"}});
        };


        const pipeline = [
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {$unwind: "$category"},
            {
                $match: {
                    ...filters,
                    ...(search? { $or: searchCondtions } : {}),
                },
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }, 
        ]

        // const finalQuery = {...filters,...searchQuery};
        const data = await Model.aggregate(pipeline);
        const countPipeline = [
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {$unwind: "$category"},
            {
                $match:{
                    ...filters,
                    ...(search? { $or: searchCondtions } : {}),
                },
            },
            { $count: "total" },
        ]

        const countResult = await Model.aggregate(countPipeline);
        const totalDocuments = countResult[0]?.total || 0
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



