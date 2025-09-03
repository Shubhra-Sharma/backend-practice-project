import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validating the details of user (like the email shall not be empty, no empty fullname) - not empty
    // check if user already exists: check using username or email
    // avatar and cover image shall not be empty
    // upload both to cloudinary
    // create user object - create entry in db (mongodb is a nosql db, it needs object)
    // remove password ( we need to first hash password and then insert it into DB) and refresh token field from response
    // check for user creation
    // return response
    const {fullName, email, username, password} = req.body;
    
    if([
        fullName, email, username, password
    ].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    // check if there is a user with different username having same email or a user with same username 
    const existedUser= await User.findOne({
     $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    // req.files :- theses files access given by multer by default
    // 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath; 
// To handle the case where coverimage is not uploaded by the user
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenth>0){
    coverImageLocalPath = req.files.coverImage[0].path;
}
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }
    // coverImg not compulsory
    const avatar=  await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400, "Avatar is required");
    } //if avatar is not present then it will cause the DB to fail as avatar is compulsory and required
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // means ye dono fields select nahi hongi user ki
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user.");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully.")
    )
} )
export {registerUser};