import { Router, Request, Response, NextFunction } from "express";
import route_check_midd from "../middlewares/checker";
const router = Router();
import { pool } from "../db/db";

import route_crud_midd from "../middlewares/crud";

import redis from "redis";


//type-casting

type fakes={fakeuser:string,pass:any}
declare module "express-session" {
  interface SessionData {
    user: {
      username: string;
      role: string;
    };
  }
}
interface crm{
  id:number;
  category:string;
  chapter_name:string;
  drive_link:any;
  claz:number;
  target_Exam:string;
}
const faker:fakes={
  fakeuser:"admin",
  pass:"far0910"
} 
// Apply middleware to all routes
router.get("/", (req: Request, res: Response) => {

  res.redirect("/login"); // Or wherever index.ejs is rendered
});
router.get("/login", (req: Request, res: Response) => {
  //req.flash("f_success", "Login successful!")
  //req.session.user = {username:"fardeen khan", role:"superuser"}
  //console.log(req.session.user);
  //console.log(req.flash("f_success"));
  res.render("index");
});
router.use("/admin",route_check_midd)
router.get("/admin",(req:Request,res:Response)=>{
  res.render("AdminCRM",{curruser: req.session.user?.username}) //'!'--MAYBE USED
})
router.post("/login",(req:Request,res:Response)=>{
  req.flash("f_error","")
  const username=req.body.username;
  const password=req.body.password;
  console.log(typeof(username), password);
    
  
  if (typeof username !=="string"){
    req.flash("f_error","")
    req.flash("f_error", "Invalid username format!");
    res.redirect("/login");
  }
  else{
      if (username===faker.fakeuser && password===faker.pass){
        req.flash("f_success", "Login successful!");
        req.session.user = {
          username: username,
          role: "superuser"}
        res.redirect("/admin");
      }
      else{
        req.flash("f_error", "Login failed!");
        res.redirect("/login");
      }

  }

})
router.get("/logout", (req: Request, res: Response) => {
  req.flash("f_success", "Logout successful!");
  req.session.destroy((err:string) => {  

    if (err) {
      console.error("Session destruction error", err);
      res.status(500).send("Internal server error");
    } else {
      res.clearCookie("connect.sid");
 
      
      res.redirect("/login");
    }
  })

 })
//CRUD

const redisClient = redis.createClient({ host: "127.0.0.1",
  port: 6380,});

const cacheKey:string="videos:all"
router.get("/admin/display", async (req: Request<crm>, res: Response) => {
  
  //console.log("Fetching videos from cache or DB");
  // Check cache first    
  //console.log("hahahahah")
  
  try {
    redisClient.get(cacheKey, async (err:any, cachedData:any) => {
      if (err) return res.status(500).json({ error: "Redis error" });
      if (cachedData) {
        console.log("Cache hit",cachedData);
        return res.json(JSON.parse(cachedData));
      } else {
        const [rows]: any = await pool.query(
          "SELECT id, category, chapter_name, drive_link,class,target_exam FROM crm"
        );
        console.log("Cache miss",rows);
        redisClient.setex(cacheKey, 3600, JSON.stringify(rows));
        return res.json(rows);
      }
    });
  } catch (e:any) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/update", async (req: Request<crm>, res: Response) => {
  const { id, category, chapter_name, drive_link, claz, target_exam } = req.query;
 

  try {
    await pool.query(
      "UPDATE crm SET category=?, chapter_name=?, drive_link=?, class=?, target_exam=? WHERE id=?",
      [category, chapter_name, drive_link, claz, target_exam, id]
    );

    redisClient.get(cacheKey, async (err:any, cachedData:any) => {
      if (err) return res.status(500).json({ error: "Redis error" });

      if (!cachedData) {
        // Cache empty, reload all from DB
        try {
          const [rows]: any = await pool.query(
            "SELECT id, category, chapter_name, drive_link, class, target_exam FROM crm"
          );
          redisClient.setex(cacheKey, 3600, JSON.stringify(rows));
          return res.json({ success: true, updated: true, reloaded: true });
        } catch (dberr:any) {
          return res.status(500).json({ error: "DB error" });
        }
      } else {
        // Cache present, update the relevant video
        let videos:any = JSON.parse(cachedData);
        videos = videos.map((v: any) =>
          String(v.id) === String(id)
            ? { ...v, category, chapter_name, drive_link, claz, target_exam }
            : v
        );
        redisClient.setex(cacheKey, 3600, JSON.stringify(videos));
        return res.json({ success: true, updated: true });
      }
    });
  } catch (e:any) {
    console.error("DB Error:", e);
    //return res.status(500).json({ error: "Server error" });
  }
});
router.use("/admin/:id",route_crud_midd)
router.get("/admin/:id", async (req: Request<crm>, res: Response) => {
 
  const id = Number(req.params.id);
  console.log("Fetching video with id:",typeof(id));


  try {
    redisClient.get(cacheKey, async (err:any, cachedData:any) => {
      
      if (err) return res.status(500).json({ error: "Redis error" });

      let videos: any;
      if (cachedData) {
        videos = JSON.parse(cachedData);
        console.log("Looking for id:", id, "in videos:", videos);
      } else {
        const [rows]: any = await pool.query(
          "SELECT id, category, chapter_name, drive_link, class, target_exam FROM crm"
        );
        videos = rows;
        console.log("Looking for id:", id, "in videos:", videos);
        redisClient.setex(cacheKey, 3600, JSON.stringify(rows));
      }

      const video = Array.isArray(videos)
        ? videos.find((v: any) => Number(v.id) == id)
        : "moye moye";

      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
     // console.log("moye moye Found video:", video);
      return res.json(video);
    });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});


router.use("/admin/add",route_crud_midd)
router.post("/admin/add", (req: Request<crm>, res: Response) => {
  const { id, category, chapter_name, drive_link, claz, exam } = req.body;
  
  pool.query(
    "INSERT INTO crm (id, category, chapter_name, drive_link, class, target_exam) VALUES (?, ?, ?, ?, ?, ?)",
    [id, category, chapter_name, drive_link, claz, exam]
  )
    .then(() => {
      redisClient.get(cacheKey, (err, cachedData) => {
        if (err) return res.status(500).json({ error: "Redis error" });

        if (!cachedData) {
         
          pool.query(
            "SELECT id, category, chapter_name, drive_link, class, exam FROM crm"
          ).then(([rows]: any) => {
            redisClient.setex(cacheKey, 3600, JSON.stringify(rows));
            return res.json({ success: true, added: true, reloaded: true });
          });
        } else {
          // Cache present, append new entry
          let videos = JSON.parse(cachedData);
          videos.push({ id, category, chapter_name, drive_link, class: claz, exam });
          redisClient.setex(cacheKey, 3600, JSON.stringify(videos));
          return res.json({ success: true, added: true });
        }
      });
    })
    .catch((e: any) => {
      console.error("DB Error:", e);
      return res.status(500).json({ error: "Server error" });
    });
});
router.use("/admin/remove/:id",route_crud_midd)
router.get("/admin/remove/:id", async (req: Request<crm>, res: Response) => {
  const { id } = req.params;
 
  console.log("Removing video with id:", id);

  //if (!id) return res.status(400).json({ error: "ID required" });

  try {
    // Remove from DB
    await pool.query("DELETE FROM crm WHERE id = ?", [id]);

    redisClient.get(cacheKey, (err:any, cachedData:any) => {
      if (err) return res.status(500).json({ error: "Redis error" });

      if (!cachedData) {
        // Cache empty, reload all from DB
        pool.query(
          "SELECT id, category, chapter_name, drive_link, class, target_exam FROM crm"
        ).then(([rows]: any) => {
          redisClient.setex(cacheKey, 3600, JSON.stringify(rows));
          return res.json({ success: true, removed: true, reloaded: true });
        }).catch((dbErr: any) => {
          return res.status(500).json({ error: "DB error" });
        });
      } else {
        // Cache present, remove the entry from cache
        let videos:any = JSON.parse(cachedData);
        videos = videos.filter((v: any) => String(v.id) !== String(id));
        redisClient.setex(cacheKey, 3600, JSON.stringify(videos));
        return res.json({ success: true, removed: true });
      }
    });
  } catch (e) {
    console.error("DB Error:", e);
    //return res.status(500).json({ error: "Server error" });
  }
});
// ...existing code...

export =router;
