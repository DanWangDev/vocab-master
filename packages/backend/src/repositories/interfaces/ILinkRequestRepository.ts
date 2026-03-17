import type { LinkRequestRow, StudentSearchResult } from '../../types/index.js';

interface LinkRequestWithUsers extends LinkRequestRow {
  parent_username: string;
  parent_display_name: string | null;
  student_username: string;
  student_display_name: string | null;
}

export type { LinkRequestWithUsers };

export interface ILinkRequestRepository {
  findById(id: number): LinkRequestRow | undefined;
  findByIdWithUsers(id: number): LinkRequestWithUsers | undefined;
  searchStudents(query: string, parentId: number): StudentSearchResult[];
  hasPendingRequest(parentId: number, studentId: number): boolean;
  create(parentId: number, studentId: number, message?: string): LinkRequestRow;
  findByParent(parentId: number): LinkRequestWithUsers[];
  findPendingByParent(parentId: number): LinkRequestWithUsers[];
  findByStudent(studentId: number): LinkRequestWithUsers[];
  findPendingByStudent(studentId: number): LinkRequestWithUsers[];
  accept(requestId: number, studentId: number): boolean;
  reject(requestId: number, studentId: number): boolean;
  cancel(requestId: number, parentId: number): boolean;
}
