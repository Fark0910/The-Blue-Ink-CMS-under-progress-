import { Request, Response, NextFunction } from "express";

export default function flash_midd(req: Request, res: Response, next: NextFunction) {
  res.locals.message = {
    success: req.flash("f_success"),
    error: req.flash("f_error"),
    info: req.flash("f_info")
  };
  next();
}
