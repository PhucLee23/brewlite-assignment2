import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Ghi một dòng JSON cho mỗi request ra stdout (NFR-12, architecture §3.4).
 * Không ghi body, header Authorization hay query có thể chứa dữ liệu nhạy cảm.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const started = process.hrtime.bigint();
    const header = req.headers['x-request-id'];
    const requestId = typeof header === 'string' && header.length <= 100 ? header : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      if (process.env.NODE_ENV === 'test') return;
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(
        JSON.stringify({
          time: new Date().toISOString(),
          level: 'info',
          requestId,
          method: req.method,
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          durationMs: Math.round(durationMs * 10) / 10,
        }),
      );
    });
    next();
  }
}
