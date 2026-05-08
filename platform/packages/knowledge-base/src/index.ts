// Data access
export {
  createPortal,
  getPortalById,
  getPortalBySlug,
  listPortals,
  updatePortal,
} from './data/portals.js';

export {
  createCategory,
  getCategoryById,
  listCategoriesByPortal,
  listSubCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from './data/categories.js';

export {
  createArticle,
  getArticleById,
  getArticleBySlug,
  listArticlesByPortal,
  updateArticle,
  deleteArticle,
  publishArticle,
  archiveArticle,
  incrementViewCount,
  searchArticles,
} from './data/articles.js';

// Routes
export { createPortalRoutes } from './routes/portals.js';
export { createCategoryRoutes } from './routes/categories.js';
export { createArticleRoutes } from './routes/articles.js';
export { createPublicRoutes } from './routes/public.js';

// Types
export type {
  ArticleStatus,
  PortalRecord,
  PortalCreate,
  PortalUpdate,
  CategoryRecord,
  CategoryCreate,
  CategoryUpdate,
  ArticleRecord,
  ArticleCreate,
  ArticleUpdate,
} from './types.js';

// Manifest
export { manifest } from './manifest.js';
