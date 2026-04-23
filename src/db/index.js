import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        // console.log(`\n MongoDB connected \n DB HOST: `);
        const connectionInstance = await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected \n DB HOST: ${connectionInstance.connection.host}`);
        // console.log(connectionInstance)
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}
export default connectDB
/*
crux:

export default connectDB
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    } catch (error) {
        process.exit(1)
    }
}
export default connectDB

                                    import
                                    async connect
                                    try 
                                    catch
                                    export
*/
/*
 Import Mongoose for MongoDB interaction
 Import DB_NAME constant from a constants file
 Define async function to connect to MongoDB
 Connect to MongoDB using MONGODB_URI and DB_NAME
 Log successful connection with host details
 Log connection error and exit process
 Export the function for use in other modules export default connectDB;
*/

// import mongoose from "mongoose";

// const connectDB = async () => {
//     try{
//         const connectionIns = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         console.log(connectionIns.connection.host);
//     }
//     catch(error)
//     {
//         console.log("error: ", error);
//         process.exit(1);
//     }
// }

// export default connectDB;



// import mongoose from "mongoose";
// import {DB_NAME} from "../constants.js";


// const connectDB = async() => {
//     try{
//         const instance = await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`);
//         // console.log(`Connected to mongo, ${instance.connections.nativeclea}`);
//         console.log(instance)
//     }
//     catch(err)
//     {
//         console.log("error occured", err);
//         process.exit(1);
//     }
// }

// export default connectDB