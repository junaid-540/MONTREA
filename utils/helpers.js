// pagination + search (flexible: simple find() by default, optional aggregation with lookup)
export const getPaginateData = async (Model, req, options = {}) => {
    try {
        const {
            searchFields = [],
            filters = {},
            sort = { createdAt: -1 },
            limit = 6,
            //  Optional lookup for joins (e.g., for products)
            lookup = null,  // e.g., { from: 'categories', local: 'categoryId', foreign: '_id', as: 'category', searchOn: 'category.name' }
        } = options;

        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : "";

        // Build search conditions (base + optional related field)
        let searchConditions = [];
        if (search) {
            searchFields.forEach((field) => {
                searchConditions.push({ [field]: { $regex: search, $options: "i" } });
            });
            // If lookup provided and searchOn specified, add related search
            if (lookup && lookup.searchOn) {
                searchConditions.push({ [lookup.searchOn]: { $regex: search, $options: "i" } });
            }
        }

        let data, totalDocuments;

        if (lookup) {
            // Aggregation mode: For models with relations (e.g., products)
            const pipeline = [
                {
                    $lookup: {
                        from: lookup.from,
                        localField: lookup.local,
                        foreignField: lookup.foreign,
                        as: lookup.as,
                    },
                },
                { $unwind: `$${lookup.as}` },  // Unwind only if array (assumes 1:1)
                {
                    $match: {
                        ...filters,
                        ...(search ? { $or: searchConditions } : {}),
                    },
                },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
            ];

            data = await Model.aggregate(pipeline);

            // Count pipeline (separate to avoid double-counting)
            const countPipeline = [
                {
                    $lookup: {
                        from: lookup.from,
                        localField: lookup.local,
                        foreignField: lookup.foreign,
                        as: lookup.as,
                    },
                },
                { $unwind: `$${lookup.as}` },
                {
                    $match: {
                        ...filters,
                        ...(search ? { $or: searchConditions } : {}),
                    },
                },
                { $count: "total" },
            ];

            const countResult = await Model.aggregate(countPipeline);
            totalDocuments = countResult[0]?.total || 0;
        } else {
            //  Old find() behavior (for admin/users/categories)
            const finalQuery = {
                ...filters,
                ...(search ? { $or: searchConditions } : {}),
            };
            totalDocuments = await Model.countDocuments(finalQuery);
            data = await Model.find(finalQuery).sort(sort).skip(skip).limit(limit);
        }

        const totalPages = Math.ceil(totalDocuments / limit);

        return {
            data,
            totalPages,
            currentPage: page,
            search,
        };
    } catch (error) {
        console.error("Error in getPaginateData:", error);
        throw error;
    }
};