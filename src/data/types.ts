export interface MenuItemType {
  id: string;
  category: string;
  subCategory: string;
  title: string;
  price: string;
  description?: string;
  image: string;
  isVegan?: boolean;
  isAvailable?: boolean;
}

export interface AdminMenuItemType {
  id: string;
  category: string;
  subCategory: string;
  title: string;
  description: string;
  price: string;
  image: string;
  isVegan: boolean;
  isAvailable: boolean;
  sortOrder: number;
}
