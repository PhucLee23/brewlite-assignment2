import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/**
 * Chuẩn hóa mọi lỗi về dạng `{ statusCode, message, error }` với thông báo tiếng Việt.
 * Lỗi không lường trước trả 500 và chỉ ghi chi tiết vào log, không trả ra ngoài.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && !('message' in body && isEnglishDefault(body.message))) {
        res.status(status).json(body);
        return;
      }
      res.status(status).json({ statusCode: status, message: vietnamese(status, body), error: STATUS_TEXT[status] });
      return;
    }

    console.error(
      JSON.stringify({
        time: new Date().toISOString(),
        level: 'error',
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.originalUrl.split('?')[0],
        error: exception instanceof Error ? exception.message : String(exception),
      }),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: 'Máy chủ gặp lỗi, vui lòng thử lại sau',
      error: STATUS_TEXT[500],
    });
  }
}

// Thông báo mặc định tiếng Anh do Nest/Express sinh ra (route không tồn tại, JSON hỏng…)
function isEnglishDefault(message: unknown): boolean {
  return typeof message === 'string' && /^(Cannot (GET|POST|PATCH|PUT|DELETE)|Unexpected|Bad Request|Not Found|Forbidden resource|Unauthorized|Expected|.*JSON)/.test(message);
}

function vietnamese(status: number, body: unknown): string {
  const message = typeof body === 'string' ? body : (body as { message?: string }).message ?? '';
  if (status === 404) return 'Không tìm thấy đường dẫn';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này';
  if (status === 401) return 'Vui lòng đăng nhập';
  if (status === 400 && /JSON|Unexpected|Expected/.test(message)) return 'Dữ liệu gửi lên không phải JSON hợp lệ';
  if (status === 400) return 'Dữ liệu không hợp lệ';
  return message;
}
