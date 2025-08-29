import { Request, Response, NextFunction } from "express";
export default function route_check_midd(req: Request, res: Response, next: NextFunction) {
  if (req.session.user) {
    next();
  } else {
    req.flash("f_info", "Unauthorized access!");
    res.redirect("/login");
  }
}