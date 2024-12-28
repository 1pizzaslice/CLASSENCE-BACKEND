"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const controllers_1 = require("../controllers");
const middlewares_1 = require("../middlewares");
router.post('/create', middlewares_1.fileUploadMiddleware, controllers_1.createAssignment);
router.put('/edit/:id', middlewares_1.fileUploadMiddleware, controllers_1.updateAssignment);
router.delete('/delete', controllers_1.deleteAssignment);
router.get('/get', controllers_1.getAssignments);
exports.default = router;