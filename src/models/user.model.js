import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { ApiError } from "../utils/apiError.js";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }

    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.statics.findByEmail = async function(email) {
    return await this.findOne({ email })
}

userSchema.statics.findByusername = async function(username) {
    return await this.findOne({ username });
}
userSchema.methods.generateAccessToken = function(){
    // return jwt.sign(
    //     {
    //         _id: this._id.toHexString(),
            // email: this.email,
            // username: this.username,
            // fullName: this.fullName
    //     },
    //     process.env.ACCESS_TOKEN_SECRET,
    //     {
    //         expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    //     }
    // )
        const ID = this._id.toHexString()
        // console.log(ID);
       const token = jwt.sign(
           {
               _id: ID,
               email: this.email,
               username: this.username,
               fullName: this.fullName,
           },
           process.env.ACCESS_TOKEN_SECRET,
           {
               expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
           }
        //    (err, token) => {
        //        if (err) console.log(err);
        //    },
       );
        return token;
    
   
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id.toHexString(),
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
// await mongoose.connect('mongodb://127.0.0.1:27017/test');
// const connection = mongoose.createConnection('mongodb://127.0.0.1:27017/test');
// export const User = connection.model("user", userSchema);
export const User = mongoose.model("User", userSchema)