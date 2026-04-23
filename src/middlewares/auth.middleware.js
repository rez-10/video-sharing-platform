import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")?.split(";")[0]
        // ?.replace("Bearer ", "")
        // console.log("Extracted Token:", token)
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, token) =>{
        //     if(err)
        //     {
        //         console.log("xyz")
        //     console.log(err);   
        //     }
        //     console.log(token)
        //     return token;
        // })
        console.log("Decoded Token:", decodedToken);
        const ID = mongoose.Types.ObjectId.createFromHexString(decodedToken._id);
        const user = await User.findById(ID).select("-password -refreshToken")
        // console.log(user);
        if (!user) {
            throw new ApiError(401, "Invalid Access Token1")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})