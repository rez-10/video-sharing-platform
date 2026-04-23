import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js"; //:: fix it to asyncHandler
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { uploadPreset, ngrokUrl, thumbnailResourceFolder } from "../constants.js";
import { v2 as cloudinary } from "cloudinary";
import redisClient from "../db/redis.js";
import mongoose from "mongoose";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAllVideos = asyncHandler( async(req, res) => {
    /*
        what needs to be done:
        get all videos for the searched query. 
        sanatise query
        if query is blank, simply get all videos
        now the video should be sorted as recent first for now,
        5 videos per page and total video count for frontend
        if query matches the title or description:
        sort all those published videos(if isPublished = false, don't) whose tiltle matches the query and then 
        list of all those videos matching the description
        sanatise query
        sortBy: createdAt, views, likes
        sortType: asc, desc
        the respone obbject for 200:
        {
            "vidoes" : {list of videos:{
            video thumbnail, title, totalviews, datePublished, duration
            owner details: owner avatar, owner name, 
            }} ,
            "pagination": {
            "page": parseInt(page),
            "limit": parseInt(limit),
            "totalVideos": totalVideos,
            "totalPages": totalPages
            }
        }
    sample response(200 OK)
        {
            "videos": [
                {
                    "thumbnail": "http://example.com/thumbnail1.jpg",
                    "title": "Funny Cats Compilation",
                    "totalViews": 1500,
                    "datePublished": "2025-05-29T10:00:00.000Z",
                    "duration": 300,
                    "owner": {
                        "avatar": "http://example.com/avatar1.jpg",
                        "name": "John Doe"
                    }
                },
                {
                    "thumbnail": "http://example.com/thumbnail2.jpg",
                    "title": "Funny Dogs",
                    "totalViews": 1200,
                    "datePublished": "2025-05-28T15:00:00.000Z",
                    "duration": 240,
                    "owner": {
                        "avatar": "http://example.com/avatar2.jpg",
                        "name": "Jane Smith"
                    }
                },
                // ... 3 more videos
            ],

            "pagination": {
                    "page": 1,
                    "limit": 5,
                    "totalVideos": 100,
                    "totalPages": 2,
                    "nextCursor": "2025-05-27T08:00:00.000Z:60a5f8b9c8f8b1234567890"
                }
        }


        replace unwind:
        {
                $addFields: {
                    owner: { $first: '$owner' } // Takes the first (and only) element of the owner array
                }
        },
    */

    let { page = 1, limit =5, query, sortBy, sortType} = req.query;
    limit = parseInt(limit);
    page = parseInt(page);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit > 5 || limit < 1) limit = 5;
    query = query ? query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    const validSortFields = ["createdAt", "totalViews", "likes"];
    const validSortTypes = ["asc", "desc"];
    sortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortType = validSortTypes.includes(sortType) ? sortType : "desc";

    const pipeline = [];
    const matchStage = { isPublished: true };
    if (query) 
        matchStage.$text = { $search: query };
    pipeline.push({ $match: matchStage });
    if (query) 
        pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
    pipeline.push({ $skip: (page - 1) * limit });
    
    const sortStage = query ? { score: -1 } : {};
    sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    pipeline.push({ $sort: sortStage });
    pipeline.push({
        $facet: {
            videos: [
                {
                    $limit: limit,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                    },
                },
                {
                    $unwind: {
                        path: "$owner",
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $project: {
                        thumbnail: 1,
                        title: 1,
                        totalViews: 1,
                        duration: 1,
                        owner: {
                            avatar: "$owner.avatar",
                            name: "$owner.name",
                        },
                    },
                },
            ],
            totalCount: [{ $count: "count" }],
        },
    });

    // const getVideos = await Video.aggregate(pipeline);
    // 

    // const response = {
    //     getVideos[0].videos,
    // }
    // return res
    // .status(200)
    // .json(200, )
    const result = await Video.aggregate(pipeline);

    const videos = result[0].videos || [];
    const totalVideos = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalVideos / limit);
    // if(!videos?.length)
    //         throw new ApiError(404, "No video found");
    const response = {
        videos,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalVideos,
            totalPages,
        },
    };

    return res
        .status(200)
        .json(new ApiResponse(200, response, "Videos Fetched"));
});

const uploadVideo = asyncHandler(async(req, res) =>{
    /*
        what we're gonna do is:
        take video credentials from the client, partially save it with/without thumbnail
        data like: title, description, owner details from jwt and save it on DB with isPublished == false
        verify the file and other data, sanatize it and then give the client access to cloudinary signed asset
        signed asset basically authorizes if server and the client is same as talked about through its signature?
        client will then upload the same video on cludinary
        when this API is done.
        when upload is finished, cloudinary will send you a webhook with some metadata, just save it on the DB of course, different API
        now, check for validation, sanatisation, step wise process, error handling and optimisation
        error handling:
        what if the user is unauthorized?
        what if file contains mallicious data?
        what if upload fails, can we trace back to previously uploaded?
        what if upload is successfull but error sending in video link? (most crucial)
        what if DB upload fails after we got the link, we can't say user to upload again!
        what if upload fails due to bandwidth error? can we get file chunks till it was uploaded?
        check if title alredy exists? 
        what if user uploads the same video twice?
     */
    // if (!req.body) throw new ApiError(400, "Request body is missing");
    const { title, description } = req.body;
    if (
        [title, description].some(
            (field) =>
                field === undefined || field === null || field?.trim() === "",
        )
    )
        throw new ApiError(400, "All fields are required");

    let thumbnailLocalPath = null;
    if (
        req.files &&
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0
    )
        thumbnailLocalPath = req.files.thumbnail[0].path;

    let thumbnailUrl = null;
    if (thumbnailLocalPath !== null)
        thumbnailUrl = await uploadOnCloudinary(
            thumbnailLocalPath,
            thumbnailResourceFolder,
        );

    let videoFile;
    if (
        req.files &&
        Array.isArray(req.files.video) &&
        req.files.video.length > 0
    )
        videoFile = req.files.video[0];

    if (!videoFile) throw new ApiError(400, "Video Chunk Missing");

    // Get signature from cloudinary,
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
        timestamp,
        upload_preset: uploadPreset,
        notification_url: ngrokUrl,
    };
    let signature;
    try {
        signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET,
        );
    } catch (signError) {
        throw new ApiError(500, "Signature generation failed", [], signError.message);
    }
    // console.log(thumbnailUrl, "this is thumbnailURL");
    // console.log(description);

    // const videoBuffer = videoFile.buffer;
    const videoId = new mongoose.Types.ObjectId().toString();
    // const hashKey = `${signature}video:${videoId}`;
    const hashKey = `video:${signature}`;
    // console.log("Redis Args:", hashKey, thumbnailUrl, title, description, req.user._id.toHexString()); //
    
    try {
        await redisClient.hSet(hashKey, {
            thumbnailUrl: thumbnailUrl,
            title: title,
            description: description,
            owner: req.user._id.toHexString(),
        });
        await redisClient.expire(hashKey, process.env.TTL); // set ttl in env
    } catch (redisError) {
        //add fallback condition
        console.log(redisError);
        throw new ApiError(503, "Redis unavailable", [], redisError);
    }
   
    // console.log(ngrokUrl)
    // add this to env
    

    const response = {
        signature: signature,
        timestamp: timestamp,
        key: hashKey,
    };

    return res
        .status(201)
        .json(new ApiResponse(200, response, "Partial data saved on redis"));
    //setup route, and keep the redis running in index folder
});

const getWebhook = asyncHandler(async (req, res) =>{
    /*
        get redis key and save the info DB, 
        add fallback of redis
        if saved on DB, notify user and log 
        user will get periodic/ real time upload stats (as in how much of video is uploaded? yes)
        get user details from redis(save user details while saving title and description) and initiate a get request or build a notification mechanism?
        if(fails)
            if(redis error)
                get details from the fallback added
            think of other cases
        
        notification system: (sends notification to user)
            it'll receive which user to send, userID and what message to send
            if message reached him, then ok
            if user is offline, message will reach him once he's online.
     */
   //what do we need?
   //create public_id of video and it'll be used to create videoID
   //title, description, owner details, duration, secureurl, thumbnail
   // if saving on DB fails, then?
   console.log(req.body)
   const { secure_url, duration, signature, notification_type } = req.body;
   if (
       !secure_url ||!duration || !signature ||
       !notification_type !== "upload"
   ) {
        console.log("Invalid webhook payload");
      return res.status(400).json({ message: "Invalid webhook payload" });
      //log error
   }
    const hashKey = `video:${signature}`;
    let thumbnailUrl, owner, title, description;
    try {
        const {thumbnailUrl, owner, title, description} = await redisClient.hGetALL(hashKey);
        if (!thumbnailUrl || !owner || !title || !description) {
            console.log("Credentials not found on redis");
            return res
                .status(404)
                .json({ message: "No credentials found for this upload" });
        }
    } catch (redisError) {
        console.log("Something's wrong with redis. Fix it, NOW!")
        return res.status(503).json({
            message: "Redis unavailable",
            error: redisError.message,
        });
    }
    const video = await Video.create({
        videoFile: secure_url,
        thumbnail: thumbnailUrl,
        owner: new mongoose.Types.ObjectId(owner),
        title: title,
        description: description,
        duration: duration,

    });
    try {
        await redisClient.del(hashKey);
    } catch (delError) {
        console.warn("Failed to delete Redis key:", delError.message); 
        // Log but proceed
    }
    console.log("Webhook processed successfully")
    return res
        .status(200)
        .json({
        message: "Webhook processed successfully",
        videoId: video._id.toString(),
    });
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    /*
        get video details like:
        {
            videofile,
            thubnail,
            duration,
            title,
            description,
            noOfViews,
            createdAt,
            likecounts,
            comments: {
                        {
                            comment,
                            commentedBy:{
                                        username,
                                        avatar,
                                        createdAt/updatedAt,
                                        noOfLikes,
                                        commentReplies:{an object same as comment but commented to is also added},
                                    }
                            createdAt/updatedAt,
                            }, 
                        {totalCommentsCount}
                    }
            owner details: {
                            name,
                            avatar,
                            subscribers/followers count,
                        }
        }
     */
});
export{getAllVideos, uploadVideo, getWebhook}