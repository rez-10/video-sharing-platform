import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { coverImageResourceFolder, avatarResourceFolder } from "../constants.js";
import zxcvbn from "zxcvbn";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
// import { Subscription } from "../models/subscription.model.js";
// import { Video } from "../models/video.model.js";

const accessTokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    // maxAge: process.env.ACCESS_TOKEN_MAXAGE * 60 * 1000,
};
const refreshTokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    // maxAge: process.env.REFRESH_TOKEN_MAXAGE * 60 * 1000,
};

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        console.log(user._id.toHexString())
        return { accessToken, refreshToken };
    } catch (error) {
        console.error(error);
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token",
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    //  validation - not empty and all fields are there
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body; // validate for string, if request body contains string
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some(
            (field) =>
                field === undefined || field === null || field?.trim() === "",
        )
    ) {
        // ::add validator
        throw new ApiError(400, "All fields are required");
    }
    const passwordStrength = zxcvbn(password, [fullName, email, username]);
    if (passwordStrength.score < 2) {
        throw new ApiError(
            400,
            ` Password is too weak: ${passwordStrength.feedback.warning || "Please choose a stronger password"}.  
            Suggestions: ${passwordStrength.feedback.suggestions.join(" ")}`,
        ); //::suggestion might return non empty array and same for non empty string in .warning
    }
    const existedUser = await User.findOne({ $or: [{ username }, { email }] }); //:: performance check

    if (existedUser)
        throw new ApiError(409, "User with email or username already exists");

    //console.log(req.files);
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    )
        coverImageLocalPath = req.files.coverImage[0].path;

    let avatarLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    )
        avatarLocalPath = req.files.avatar[0].path;

    if (!avatarLocalPath) {
        // console.error();
        throw new ApiError(400, "Avatar file is required");
    }
    // :: upload it on server first
    const avatar = await uploadOnCloudinary(avatarLocalPath, avatarResourceFolder);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, coverImageResourceFolder);

    if (!avatar) 
        throw new  ApiError(400, "Avatar2 file is required");

    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username?.toLowerCase(),
    });

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    if (!createUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user",
        );
    }

    return res
        .status(210)
        .json(new ApiResponse(101, createUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    // console.log(req.body);
    const { email, username, password } = req.body;
    // console.log(email);
    //::no need of line below since validator is already added
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findByEmail(email);
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
        user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully",
            ),
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    //get user ID from req.user which was appended at time of jwt verification
    //update regfresh token in databse
    //clear cookies in response
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, //add whatever field you want to update
            },
        },
        {
            new: true,
        },
    );

    return res
        .status(200)
        .clearCookie("accessToken", accessTokenOptions)
        .clearCookie("refreshToken", refreshAccessToken)
        .json(new ApiResponse(200, {}, "User logged out!!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    //get user's refreshToken from ccokies or header
    //verify the jwt token and match it with DB
    //if exists, then generate a new pair of tokens and save it to databse andd return it to user
    const reqRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!reqRefreshToken) throw new ApiError(401, "RefreshToken Invalid");
    try {
        const decodedToken = jwt.verify(
            reqRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findById(decodedToken?._id);

        if (!user) throw new ApiError(401, "Warning! Token exists but no DB");

        if (reqRefreshToken !== user?.refreshToken)
            throw new ApiError(401, "Refresh token is expired or used");
        // console.log("xyzzzz")
        const { newAccessToken, newRefreshToken } =
        await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, accessTokenOptions)
            .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
            .json(new ApiResponse(200, {}, "tokens refreshed"));
    } catch (err) {
        throw new ApiError(
            401,
            err.message || "Warning! Something wrong while updating tokens",
        );
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    //get current password and check it's true
    //update new password to databse
    //logout from other device if logged and notify changed and logged out
    // console.log(req.body);
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) throw new ApiError(400, "Invalid Current Password");
    const passwordStrength = zxcvbn(newPassword, [user.fullName, user.email, user.username]);
    if (passwordStrength.score < 2) {
        throw new ApiError(
            400,
            ` Password is too weak: ${passwordStrength.feedback.warning || "Please choose a stronger password"}.  
            Suggestions: ${passwordStrength.feedback.suggestions.join(" ")}`,
        ); //::suggestion might return non empty array and same for non empty string in .warning
    }
    user.password = newPassword;
    user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, {}, "Password Updated"));
});

const fetchUserProfile = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { newEmail, fullName } = req.body;
    try {
       const tempUser =  await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    email: newEmail,
                    fullName,
                },
            },
            { new: true },
        ).select("-password");
        // we don't need to update email in req.user since it'll be updated at next JWTverify
        return res.status(200).json(new ApiResponse(200, tempUser, "Email Updated"));
    } catch (err) {
        throw new ApiError(400, "Can't Update User profile");
    }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    //take path from req.file
    //upload on cloudinary
    //get link and update database
    //delete prev avatar
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file missing");
    const newAvatar = await uploadOnCloudinary(avatarLocalPath, avatarResourceFolder);
    if (!newAvatar.url)
        throw new ApiError(400, "Error while uploading avatar on couldinary");
    try {
        await User.findByIdAndUpdate(req.user?.id, {
            $set: {
                avatar: newAvatar.url,
            },
        });
        return res.status(200).json(new ApiResponse(200, newAvatar.url, "Avatar Updated"));
    } catch (err) {
        throw new ApiError(400, "Failed updating avatar on DB");
    }
    //::you can use select and new keywords, search for it
});

const updateUsercoverImage = asyncHandler(async (req, res) => {
    //take path from req.file
    //upload on cloudinary
    //get link and update database
    //delete prev avatar
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath)
        throw new ApiError(400, "Cover Image file missing");
    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath, coverImageResourceFolder);
    if (!newCoverImage.url)
        throw new ApiError(
            400,
            "Error while uploading cover image on couldinary",
        );
    try {
        await User.findByIdAndUpdate(req.user?.id, {
            $set: {
                coverImage: newCoverImage.url,
            },
        });
        return res
            .status(200)
            .json(new ApiResponse(200, "Cover image Updated"));
    } catch (err) {
        throw new ApiError(400, "Failed updating cover image on DB");
    }
});

const getChannelProfile = asyncHandler( async(req, res) => {
    /* Steps: anyone enters any username, get details
    .Take username form req.params (handle ...)
    .Use an Aggregation Pipeline on the User model to fetch:
             the channel profile for the given username.
    .Agrregation Pipeline stages: (using MongoDB Aggregation Pipeline operator(stage))
    
        1. $match (filter user collection to find the user with given username, analogy: find())
        2. $lookup (For subscribers: Joins the users collection with the subscriptions collection to:
                    find all subscriptions where this user is the channel (i.e., their subscribers).)
        3. $lookup (For Subscribed channel: Joins the users collection with the subscriptions collection again, but this time to:
                     find all subscriptions(of users) where this user is the subscriber (i.e., the channels they’re subscribed to).)
        4. $addFields (Adds new fields to the user document: subscribersCount, channelsTheUserISuubscribedTo etc.,)
                 $addfields is specific to pipeline only
        5. $project (Selects which fields to include in the final output, excluding all others.)

        The document after $addFields has many fields, including:
        subscribers and subscribedTo ARRAYS
        which we want in the final response (they’re large and not needed).
    
    .Check if Channel Exists and send response
    */
    
    const {username} = req.params
    if(!username?.trim())
        throw new ApiError(400, "Username is missing")
     //use a username validator, as in username exists in this list or agrregation does the job?
    let subscribedTo, subscriber;
    const channel = await User.aggregate([
        {
            $match: {
                username,
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel", //in subcription model
                as: "subscriber", //(list of users subscribed him, array)
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber", //in subscription model
                as: "subscribedTo", //(List of users he subscribed, Array)
            },
        },
        {
            $addFields: {
                // "$size": { "$ifNull": [ "$myFieldArray", [] ] },
                subscribersCount: { $size: { $ifNull: ["$subcribers", []] } },
                subscribedToCount: { $size: { $ifNull: ["$subcribedTo", []] }},
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?.id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if(!channel?.length)
        throw new ApiError(404, "channel does not exists")

    return res.status(200)
    .json( new ApiResponse(200, channel[0], "User Channel Fetched"))
})

const getWatchHistory = asyncHandler( async(req, res) =>{
    /* 
    Goal: Fetch the watch history of the logged-in user, including details about each video and the video’s owner (uploader).
    Input: The logged-in user’s _id (from req.user._id, set by your authentication middleware).
    Process:
       1.  Starts with the User model and finds the logged-in user.
        2. Looks up the videos in the user’s watchHistory (an array of video _ids).
        3. For each video, looks up the owner (uploader) and includes their details (e.g., fullName, username, avatar).
        4. Returns the watch history as a list of videos with owner details.
    Output: A JSON response containing the user’s watch history
            (e.g., [{ video1 }, { video2 }, ...]), where each video includes:
            its details and the owner’s info.

    
    Data Flow
        Start: The pipeline begins with the users collection, filtering for the logged-in user.
        First Join: Joins with the videos collection to get video details for the watchHistory.
        Nested Join: For each video, joins with the users collection again to get the owner’s details.
        Transform: Reshapes the owner data (from an array to a single object) for cleaner output.
        Output: Returns the user’s watchHistory as a list of videos with owner details.

    Stages:
        1. $match (Filters the users collection to find the logged-in user.)
        2. $lookup for Watch History (Joins the users collection with the videos collection to fetch the full video documents for the user’s watchHistory.)
            2.1: $lookup for Video Owner ( Nested Stage )
            2.2: $addFields to Reshape Owner
    
    Blueprint of Agrregation:
    {
        _id: "user1",
        username: "johndoe",
        watchHistory: [
            {
                _id: "video1",
                title: "Video 1",
                owner: { fullName: "Jane Doe", username: "janedoe", avatar: "avatar-url2" },
                duration: 300,
                ...
            },
            {
                _id: "video2",
                title: "Video 2",
                owner: { fullName: "Alice Smith", username: "alicesmith", avatar: "avatar-url3" },
                duration: 400,
                ...
            }
        ],
    ...
    }
    lookup always return an array
    addfield that adds or overwrites fields.
    first: returns the first element of an array.
    $project selects only the specified fields
     */
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                pipeline: [
                    //pipline is basically loop iterator as in for each video doc, there's a pipeline
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [
                                // for each owner, there's a pipeline
                                {
                                    $project: {
                                        fullName: 1,
                                        usernma: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            // add details of owner in each video
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);
    if (!user?.length) 
        throw new ApiError(404, "No hostory yet, go watch videos!");
    return res
    .status(200)
    .json(200, user[0].watchHistory, "Watch history fetched")
})
/* Things to add:
    otp login
    updateName, updateEmail
    forgot password 
 */
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    resetPassword,
    fetchUserProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUsercoverImage,
    getChannelProfile,
    getWatchHistory,
};
