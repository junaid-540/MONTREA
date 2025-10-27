import Category from "../../models/categorySchema.js";
import errorMessages from "../../utils/errorMessages.js";
import statusCodes from "../../utils/statusCodes.js";
import { getPaginateData } from "../../utils/helpers.js";
import { sendResponse } from "../../utils/responseHandler.js";





export const getCategories = async (req,res,next) =>{
    try {
            const {data:categories,search,totalPages,currentPage} = await getPaginateData(Category,req,{
                searchFields:["name"],
                sort: {createdAt: -1},
                limit:3,
            });

            // if(!result.data.length){
            //     return sendResponse(res,{
            //         success:false,
            //         message:errorMessages.NO_DATA_FOUND,
            //         statusCode:statusCodes.NOT_FOUND,
            //     });
            // }

            // return sendResponse(res,{
            //     success:true,
            //     message:errorMessages.SUCCESS,
            //     statusCode:statusCodes.OK,
            //     data:result,
            // });

            let pageSize = 3;

            res.render('admin/category-management',{
                Title: 'Category Management',
                pageCSS: '/public/css/admin/categories.css',
                pageJS: '/public/js/admin/categories.js',
                categories,
                currentPage,
                totalPages,
                search,
                pageSize,
            })


    } catch (err) {
        
        console.error("Error is getCategories:",err);
        next(err)
    }
}


export const getAddCategoryPage = async (req,res,next) =>{
    try {
        res.render('admin/add-category',{
            Title: 'Add Category',
            pageCSS: '/public/css/admin/add-category.css',
            pageJS: '/public/js/admin/add-category.js',
        })
    } catch (err) {
        console.error("Error in getAddCategoryPage:",err);
        next(err)
    }
}


export const addCategory = async (req, res, next) => {


  try {
    const { name, description } = req.body;

    if (!name) {
    
      return sendResponse(res, {
        success: false,
        message: errorMessages.NAME_REQUIRED,
        statusCode: statusCodes.BAD_REQUEST,
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    

    if (existingCategory) {
    
      return sendResponse(res, {
        success: false,
        message: errorMessages.CATEGORY_ALREADY_EXISTS,
        statusCode: statusCodes.CONFLICT,
      });
    }

    const newCategory = await Category.create({ name, description });

    return sendResponse(res, {
      success: true,
      message: errorMessages.CATEGORY_CREATED_SUCCESS,
      statusCode: statusCodes.CREATED,
      data: newCategory,
    });
  } catch (err) {

    //mongodb error//

    if (err.code === 11000) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.CATEGORY_ALREADY_EXISTS,
        statusCode: statusCodes.CONFLICT,
      });
    }
    next(err);
  }
};



export const getEitCategoryPage = async (req,res,next) =>{
 
    try {
        const {id} = req.params;

    const category = await Category.findById(id);

    if(!category){
        return sendResponse(res,{
            success:false,
            message: errorMessages.CATEGORY_NOT_FOUND,
            statusCode: statusCodes.NOT_FOUND,
        });
    }

    res.render('admin/edit-category',{
        Title: "Edit Category",
        pageCSS: "/public/css/admin/edit-category.css",
        pageJS: "/public/js/admin/edit-category.js",
        category,
    })

    } catch (err) {
        console.error("Error in getEditCategoryPage:",err)
        next(err)
    }
}


export const editCategory = async (req,res,next) =>{

    try {
        
        const {id} = req.params;

        // const {error,value} = editCategoryValidation.validate(req.body,{abortEarly:false})

        // if(error){
        //     return sendResponse(res,{
        //         success: false,
        //         message: error.details.map(e => e.message).join(', '),
        //         statusCodes: statusCodes.BAD_REQUEST,
        //     });
        // }

        const {name,description} = req.body;

        const category = await Category.findById(id);

        if(!category){
            return sendResponse(res,{
                success:false,
                message:errorMessages.CATEGORY_NOT_FOUND,
                statusCode:statusCodes.NOT_FOUND,
            });
        }

        category.name = name ?? category.name;
        category.description = description ?? category.description;

        await category.save();

        return sendResponse(res,{
            success:true,
            message:errorMessages.CATEGORY_UPDATED_SUCCESS,
            statusCode:statusCodes.OK,
            data:category,
        });
        
    } catch (err) {
        console.error("Error in editCategory:",err)
        next(err)
    }
}


export const toggleCategoryStatus = async (req,res,next) =>{

    try {
        
        const {id} = req.params
        const category = await Category.findById(id);

        if(!category){
            return sendResponse(res,{
                success:false,
                message:errorMessages.CATEGORY_NOT_FOUND,
                statusCode:statusCodes.NOT_FOUND,
            });
        }

        category.isListed = !category.isListed;
        await category.save();

        return sendResponse(res,{
            success:true,
            message: category.isListed ? "Category has been listed successfully." : "Category has been unlisted successfully.",
            statusCode:statusCodes.OK,
            data:category,
        });
        
    } catch (err) {
        console.error("Error in toggleCategoryStatus:",err)
        next(err)
    }   
}