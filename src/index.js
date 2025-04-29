// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js"
// import app from "./app.js"
import {app} from "./app.js"
// const app = app() // or this: import {app} from "./app.js"






dotenv.config({path: './.env'}) // always set path in dotenv, remember the dot
const port = process.env.PORT || 8000
connectDB() //async method return a promise, use .then and .catch
.then(()=>{
    app.on("error", (error) =>{
        console.log("Error loading app", error);
        throw error
    })
    app.listen(port, ()=>{
        console.log(`server connected at ${port}`)
    })
})
.catch((error) =>{
    console.log("DB connection failed", error)
})



























/*
import express from "express"
const app = express()
;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()


*/