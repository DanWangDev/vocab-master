import type { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

export function pagination(options?: {
  defaultLimit?: number;
  maxLimit?: number;
  allowedSortFields?: string[];
  defaultSortBy?: string;
}) {
  const {
    defaultLimit = 50,
    maxLimit = 100,
    allowedSortFields = ['created_at'],
    defaultSortBy = 'created_at'
  } = options || {};

  return (req: Request, _res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    let sortBy = (req.query.sortBy as string) || defaultSortBy;
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = defaultSortBy;
    }

    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder
    };

    next();
  };
}

export function buildPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit)
    }
  };
}
