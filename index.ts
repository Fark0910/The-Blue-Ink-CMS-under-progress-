import express from "express";
import path from "path";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import morgan from "morgan";
import session from "express-session";
import flash from "connect-flash";
import userRoutes from "./routes/route";
import flash_midd from "./middlewares/middle";
//import pool from "./db/db"; // Importing to extend the session data type

import redis from "redis";
import connectRedis from "connect-redis";

// Initialize express app
const app = express();

// Redis client (v3)
const redisClient = redis.createClient({
  host: "127.0.0.1",
  port: 6379,
});

// Redis store setup (connect-redis v6)
const RedisStore = connectRedis(session);
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(bodyParser.urlencoded({ extended: false })); 
// Use session with Redis store
app.use(
  session({
    store: new RedisStore({ client: redisClient as any}),
    secret: "meraSecretTokenYaha",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 1, //session cookie id max age after which it will be removed from redis as well(stack length decreases)
      httpOnly: true,
      secure: false,
    },
  })
);

// Other middlewares
app.use(flash());
app.use(flash_midd);

app.use(morgan("tiny"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(userRoutes);

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
}); 

