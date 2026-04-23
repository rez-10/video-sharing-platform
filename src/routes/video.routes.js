import { Router } from "express";
import { getAllVideos,
         getWebhook,
         uploadVideo,
 } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {uploaderVideo, upload} from "../middlewares/multer.middleware.js"
const router = Router()
// router.use(verifyJWT);

router.route("/").get(getAllVideos);
//validation of title, desc
//title max freq, dsc same, check for upload frequency, validate thumbnail
//insted, what I'll get from here?
/*
    JWT verified, thumbnail verified, title and freq check
    rate limited, max size of title and description
    
 */
router.route("/upload-video").post(  verifyJWT, uploaderVideo, uploadVideo);
router.route("/webhook").post(getWebhook);
export default router