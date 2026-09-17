import { Request, Response, NextFunction } from 'express';
import { SystemAuditLogger, sanitizePii } from '../utils/systemAuditLogger';

/**
 * Maps endpoint path and method to a standardized infrastructure action name.
 */
function resolveActionName(method: string, path: string): { action: string; resourceType: string } {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes('/auth/login')) {
    return { action: 'AUTH_LOGIN_ATTEMPT', resourceType: 'auth' };
  }
  if (normalizedPath.includes('/auth/register')) {
    return { action: 'AUTH_USER_REGISTRATION', resourceType: 'auth' };
  }
  if (normalizedPath.includes('/auth/refresh')) {
    return { action: 'AUTH_TOKEN_REFRESH', resourceType: 'auth' };
  }
  if (normalizedPath.includes('/status')) {
    return { action: 'DOCUMENT_STATUS_UPDATE', resourceType: 'document' };
  }
  if (normalizedPath.includes('/resubmit')) {
    return { action: 'DOCUMENT_RESUBMISSION', resourceType: 'document' };
  }
  if (normalizedPath.includes('/reviews') || normalizedPath.includes('/decision')) {
    return { action: 'DOCUMENT_REVIEW_DECISION', resourceType: 'document' };
  }
  if (normalizedPath.includes('/documents') && method === 'POST') {
    return { action: 'DOCUMENT_UPLOAD', resourceType: 'document' };
  }
  if (normalizedPath.includes('/notifications') && (method === 'PATCH' || method === 'PUT')) {
    return { action: 'NOTIFICATION_STATUS_UPDATE', resourceType: 'notification' };
  }

  return { action: `${method.toUpperCase()}_MUTATION`, resourceType: 'system' };
}

/**
 * Extracts a resource ID if present in the URL path.
 */
function extractResourceId(path: string): string | undefined {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  return match ? match[0] : undefined;
}

/**
 * System Audit Middleware.
 * Intercepts all state-changing HTTP requests (POST, PUT, PATCH, DELETE)
 * and records structured infrastructure-level audit entries with strict PII masking.
 */
export const systemAuditMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();

  // Only record state changes (mutating methods)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const startTime = Date.now();
  const path = req.originalUrl || req.url;
  const { action, resourceType } = resolveActionName(method, path);
  const resourceId = extractResourceId(path);

  // Hook into the response finish event to capture outcome
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine who performed the state change
    const user = (req as any).user;
    const userId = user?.id || user?.userId || 'unauthenticated';
    const role = user?.role || (user ? 'AUTHENTICATED' : 'ANONYMOUS');
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Extract state changes from request body, strictly sanitized
    let stateChanges: Record<string, unknown> | undefined;
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      // Filter out binary buffers or files
      const bodyClone = { ...req.body };
      delete bodyClone.file;
      delete bodyClone.files;
      stateChanges = sanitizePii(bodyClone);
    }

    // Capture file upload metadata if present
    if ((req as any).file) {
      const file = (req as any).file;
      stateChanges = {
        ...stateChanges,
        uploadedFile: {
          fieldName: file.fieldname,
          originalName: sanitizePii(file.originalname),
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      };
    }

    SystemAuditLogger.logStateChange({
      who: {
        userId: String(userId),
        role: String(role),
        ip: String(ip),
        userAgent: String(userAgent),
      },
      what: {
        action,
        method,
        path: path.split('?')[0],
        statusCode,
        durationMs,
        resourceType,
        resourceId,
        stateChanges,
      },
    });
  });

  next();
};
