import { Router } from "express";
import {
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
    
} from "../controllers/user.controller.js";
import {uploader, upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter.middleware.js";
import {validationBodyRules, resetPasswordValidation, checkRules, updateAccountValidation} from "../middlewares/validation.middleware.js"
const loginValidationBodyRules = [validationBodyRules[0], validationBodyRules[1], validationBodyRules[2]];
const router = Router()
//:: router.route("/register") = app.use("api/v1/users/register") (simply?)

router.route("/register").post(registerLimiter, uploader, validationBodyRules, checkRules, registerUser)
router.route("/login").post(loginLimiter, loginValidationBodyRules, checkRules, loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, resetPasswordValidation, checkRules, resetPassword)
router.route("/current-user").get(verifyJWT, fetchUserProfile)
router.route("/update-account").patch(verifyJWT, updateAccountValidation, checkRules, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateUsercoverImage)

router.route("/c/:username").get(verifyJWT, getChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router