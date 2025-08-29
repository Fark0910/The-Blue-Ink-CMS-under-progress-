import { Request, Response, NextFunction } from "express";
const baker:any={
  fakeuser:"admi",
  pass:"far0910"
}

export default function route_crud_midd(req: Request, res: Response, next: NextFunction) {
  if (req.session.user===baker.fakeuser && req.body.password===baker.pass) {
    next();
  } else {
    req.flash("f_info", "Unauthorized Action");
    res.redirect("/logout");
  }
}