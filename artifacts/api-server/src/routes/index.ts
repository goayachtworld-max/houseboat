import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import activitiesRouter from "./activities";
import galleryRouter from "./gallery";
import blogRouter from "./blog";
import settingsRouter from "./settings";
import authRouter from "./auth";
import inquiryRouter from "./inquiry";
import bookingsRouter from "./bookings";
import chatRouter from "./chat";
import awardsRouter from "./awards";
import faqsRouter from "./faqs";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(activitiesRouter);
router.use(galleryRouter);
router.use(blogRouter);
router.use(settingsRouter);
router.use(authRouter);
router.use(inquiryRouter);
router.use(bookingsRouter);
router.use(chatRouter);
router.use(awardsRouter);
router.use(faqsRouter);
router.use(eventsRouter);

export default router;
