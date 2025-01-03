import { Request, Response, NextFunction } from "express";
import {CustomRequest , CustomError } from "../types";
import {User} from "../models";

import jwt, { JwtPayload } from "jsonwebtoken";

 const verify =async (req: CustomRequest, res: Response, next: NextFunction) => {
    const auth = req.header('Authorization');
    if (!auth){
        next(new CustomError(`Access denied`, 401));
        return
    }
    let token = auth.split(' ')[1];
    if (!token){
        next(new CustomError(`Access denied`, 401));
        return
    }
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { _id: string , version:number };
        if (verify && '_id' in verify && 'version' in verify) {
            const user = await User.findById(verify._id);
            if(user && user.version !== verify.version){
                next(new CustomError(`Invalid token`, 400));
                return
            }
            req.user = { _id: verify._id, version:verify.version};
            next();
        } else {
            next(new CustomError(`Invalid token`, 400));
            return
        }
    } catch (error) {
        const err = error as Error;
        next(new CustomError(`Invalid token`, 400,`${err.message}`));
    }
}
export default verify;