export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'coffee' | 'tea' | 'pastry' | 'breakfast';
  image: string;
}

export interface Booking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  endTime: string;
  guests: number;
  tableId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
  userId?: string | null;
}
