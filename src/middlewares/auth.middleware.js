import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
// We use this middleware to extract user from token and validate the token for logging them out
// next ka purpose: take the req to the next middleware of controller wherever it is headed, we shall always use next when writing our own middleware
export const verifyJWT = asyncHandler(async (req, _,next) => {
    // req has cookies , from cookies we can extract token
   try {
    const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if(!token){
     throw new ApiError(401, "Unauthorized request.")
    }
    // We do jwt verify to verify the token if its correct token or invalid token
    const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if(!user){
     throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user ;
    next();
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
   }
})