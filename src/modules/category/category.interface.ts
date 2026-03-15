import { Types } from 'mongoose';

export type CategoryStatus = 'active' | 'hidden';

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: CategoryStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ICategoryCreate {
  name: string;
  slug: string;
  description?: string;
  status?: CategoryStatus;
}

// Slug thường dùng làm định danh URL, nên không cho phép update trực tiếp (tránh phá liên kết)
export interface ICategoryUpdate extends Partial<Omit<ICategoryCreate, 'slug'>> {}

export interface ICategoryQuery {
  page?: number;
  limit?: number;
  slug?: string;
  status?: CategoryStatus;
  sort?: 'newest';
}

// Dùng để map relation nếu sau này cần populate ngược (không dùng hiện tại)
export interface IGameCategoryLink {
  game_id: Types.ObjectId;
  category_id: Types.ObjectId;
}
