import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

    const generateAccessAndRefreshTokens = async (userID) => {
        try{
         const user =  await User.findById(userID);
         const accessToken = user.generateAccessToken();
         const refreshToken = user.generateRefreshToken();
         user.refreshToken = refreshToken; // inserted refreshtoken in user object
         await user.save({validateBeforeSave: false}); // save the modified user object in database, do not validate , just save the user
         return {accessToken, refreshToken};
        }catch{
            throw new ApiError(500, "Something went wrong while generating Refresh and access token");
        }
    }
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
// first we will collect user's info from req
// username or email based login
// first find user
// if user found, check password
// access and refresh token
// send both token in cookies to frontend
const loginUser = asyncHandler(async (req,res)=> {
    const {email, username, password} = req.body;
    if(!username && !email){
        throw new ApiError(400, "username or email is required");
    }
    const user = await User.findOne({
        $or: [{username}, {email}] // this $or is a mongodb function which finds a user based on the username or email
    })
    if(!user){
        throw new ApiError(404, "user does not exist");
    }
    const isPasswordValid= await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }
    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // we created a new referene to User because this reference "user" does not contain our updated refresh and access token
// options is just an object for cookies
    const options = {
        httpOnly : true,
        secure : true // making these two properties true prevents the frontend from modifying cookies, now only the server can modify these cookies
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken  // we sent the tokens using cookies but we are also sending tokens in json response because it can be the case that the user might want to save these tokens in localstorage
        },
        "User logged in successfully."
    )
    )
})

const logoutUser = asyncHandler(async (req,res) => {
   await User.findByIdAndUpdate(req.user_id,{
    $set: {
        refreshToken: undefined
    }
   },{
    new: true // study about this
   });
    const options = {
        httpOnly : true,
        secure : true // making these two properties true prevents the frontend from modifying cookies, now only the server can modify these cookies
    };
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{}, "User logged out successfully.")
    );

})
export {registerUser, loginUser, logoutUser};