import { Router } from "express";
import { createItinerary, getTravels, getTravelByMd, getItineraryMd, fetchItineraryInfo } from "../controllers/travel.js";
import { authRequired } from "../middlewares/authMiddleware.js";

const router = Router();
router.post("/createItinerary", authRequired, createItinerary);
router.post("/getTravels", authRequired, getTravels);
router.get("/getTravels", authRequired, getTravelByMd);
router.post("/getItineraryMd", authRequired, getItineraryMd);
router.post("/fetchItineraryInfo", authRequired, fetchItineraryInfo);

export default router;
