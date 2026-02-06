import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface UserPayload {
  user_id: number;
  email: string;
  department: string;
  role: 'user' | 'manager' | 'admin' | 'digital_marketing';
  full_name: string;

  /**
   * ใช้กับ role = digital_marketing เพื่อให้เห็นข้อมูลมากกว่า 1 แผนก
   * (แต่ไม่ใช่ทุกแผนก)
   */
  allowed_departments?: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): UserPayload | null {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function canAccessDepartment(user: UserPayload, department: string): boolean {
  if (user.role === 'admin') return true;

  // Digital Marketing: เห็นได้หลายแผนกตามที่กำหนดไว้
  if (user.role === 'digital_marketing') {
    const allowed = Array.isArray(user.allowed_departments) ? user.allowed_departments : [];
    return allowed.includes(department);
  }

  return user.department === department;
}

/**
 * คืนรายการแผนกที่ user สามารถเข้าถึงได้
 * - admin: null (หมายถึงทั้งหมด)
 * - digital_marketing: array ของแผนกที่กำหนด
 * - อื่นๆ: array 1 ค่า (แผนกตัวเอง)
 */
export function getAccessibleDepartments(user: UserPayload): string[] | null {
  if (user.role === 'admin') return null;
  if (user.role === 'digital_marketing') {
    const allowed = Array.isArray(user.allowed_departments) ? user.allowed_departments : [];
    return allowed;
  }
  return [user.department];
}

export function canManageUsers(user: UserPayload): boolean {
  return user.role === 'manager' || user.role === 'admin';
}

export function isAdmin(user: UserPayload): boolean {
  return user.role === 'admin';
}
