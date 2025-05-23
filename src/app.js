import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import {matchedData, query, validationResult, checkExact} from "express-validator"
// const { query, validationResult } = require('express-validator');
const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended:true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.routes.js'
// app.get('/', (req, res) => {
//     // res.send('Hello World!')
//     // res.send(`Hello, ${req.query.person}!`);

    
//   })


// app.get('/hello', query('person').notEmpty().escape(), (req, res) => {
//     const result = validationResult(req);
//     if (result.isEmpty()) {
//       const data = matchedData(req); // ::data  = req.query? I guess
//       return res.send(`Hello, ${data.person}!`);
//     }
  
//     res.send({ errors: result.array() });
//   });
  
app.use("/api/v1/users", userRouter) // :: add id if logged in so it'll open user homapage

//https/domain_name/api/vi/user/register
export { app };
