import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from '../../models';
import fs from 'fs/promises';
import { cloudinary } from '../../config';
import { IAssignment } from "../../models/assignments";

const updateAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, description, dueDate } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  const newMediaUrls: string[] = [];

  try {
    const assignment = await Assignment.findById(id)
    .populate({
        path: "classroom",
        select:"teacher",
        populate: {
            path: "teacher",
            select: "_id",
        },
    })as unknown as IAssignment & {classroom:{teacher:{_id:string}}} ;

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }
    if(assignment.dueDate < new Date()){
      return next(new CustomError('Assignment is locked',400));
    }

    if(assignment.classroom.teacher._id.toString() !== req.user?._id.toString()){
      return next(new CustomError('You are not authorized to update this assignment',403));
    }

    if (name) assignment.name = name;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    if (files && files.length > 0) {
        if (assignment.media && assignment.media.length > 0) {
          for (const url of assignment.media) {
            const publicId = url.split('/').pop()?.split('.')[0];
            if (publicId) {
              await cloudinary.uploader.destroy(`assignments/${publicId}`);
            }
          }
        }

      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: "auto",
          folder: "assignments",
        });
        newMediaUrls.push(result.secure_url);

        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error(`Failed to delete local file: ${file.path}`, err);
        }
      }

      assignment.media = [...(assignment.media || []), ...newMediaUrls];
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment,
    });

  } catch (error) {
    const err = error as Error;
    next(new CustomError("Failed to update assignment", 500, `${err.message}`));
  }
};

export default updateAssignment;