import { Router } from "express";
import authRoutes from "./auth.routes";
import adminUserRoutes from "./adminUser.routes";
import roleRoutes from "./role.routes";
import permissionRoutes from "./permission.routes";
import categoryRoutes from "./category.routes";
import tagRoutes from "./tag.routes";
import faqRoutes from "./faq.routes";
import mediaRoutes from "./media.routes";
import articleRoutes from "./article.routes";
import leadRoutes from "./lead.routes";
import landingRoutes from "./landing.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin-users", adminUserRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/categories", categoryRoutes);
router.use("/tags", tagRoutes);
router.use("/faqs", faqRoutes);
router.use("/media", mediaRoutes);
router.use("/articles", articleRoutes);
router.use("/leads", leadRoutes);
router.use("/landing", landingRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
